import { ChecksumAlgorithm, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import cx from "classnames";
import {
  constant,
  filter,
  find,
  isEmpty,
  map,
  omit,
  size,
  sum,
  times,
  zipObject,
} from "lodash/fp";
import React, { useContext, useEffect, useState } from "react";
import {
  ANALYTICS_EVENT_NAMES,
  trackEvent,
  withAnalytics,
} from "~/api/analytics";
import {
  completeSampleUpload,
  getUploadCredentials,
  initiateBulkUploadLocalWithMetadata,
  startUploadHeartbeat,
  uploadSampleFilesToPresignedURL,
} from "~/api/upload";
import { UserContext } from "~/components/common/UserContext";
import LoadingBar from "~/components/ui/controls/LoadingBar";
import PrimaryButton from "~/components/ui/controls/buttons/PrimaryButton";
import { LOCAL_MULTIPART_UPLOADS_FEATURE } from "~/components/utils/features";
import { formatFileSize } from "~/components/utils/format";
import { logError } from "~/components/utils/logUtil";
import PropTypes from "~/components/utils/propTypes";
import Modal from "~ui/containers/Modal";
import { IconAlert, IconCheckSmall } from "~ui/icons";
import ImgUploadPrimary from "~ui/illustrations/ImgUploadPrimary";
import Notification from "~ui/notifications/Notification";
import UploadConfirmationModal from "./UploadConfirmationModal";
import cs from "./upload_progress_modal.scss";
import {
  addFlagsToSamples,
  logUploadStepError,
  redirectToProject,
} from "./upload_progress_utils";

const LocalUploadProgressModal = ({
  adminOptions,
  clearlabs,
  technology,
  medakaModel,
  metadata,
  onUploadComplete,
  project,
  samples,
  skipSampleProcessing,
  uploadType,
  useStepFunctionPipeline,
  wetlabProtocol,
  workflows,
}) => {
  const userContext = useContext(UserContext);
  const { allowedFeatures = [] } = userContext || {};

  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);

  // State variables to manage download state
  const [retryingSampleUpload, setRetryingSampleUpload] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Store samples created in API
  const [locallyCreatedSamples, setLocallyCreatedSamples] = useState([]);

  // State to track download progress
  const [sampleFileUploadIds, setSampleFileUploadIds] = useState({});
  const [sampleUploadPercentages, setSampleUploadPercentages] = useState({});
  const [sampleUploadStatuses, setSampleUploadStatuses] = useState({});
  const [sampleFileCompleted, setSampleFileCompleted] = useState({});

  let sampleFilePercentages = {};

  const IN_PROGRESS_STATUS = "in progress";
  const ERROR_STATUS = "error";

  useEffect(() => {
    initiateUploadLocal();
  }, []);

  useEffect(() => {
    // For local uploads, check if all samples are completed whenever sampleUploadStatuses changes.
    if (!uploadComplete && isEmpty(getLocalSamplesInProgress())) {
      onUploadComplete();
      setUploadComplete(true);
      setRetryingSampleUpload(false);

      const numFailedSamples = size(getLocalSamplesFailed());
      if (numFailedSamples > 0) {
        const failedSamples = filter(
          sample => sampleUploadStatuses[sample.name] === "error",
          samples,
        );
        const createdSamples = filter(
          sample => sampleUploadStatuses[sample.name] !== "error",
          samples,
        );
        trackEvent(
          ANALYTICS_EVENT_NAMES.LOCAL_UPLOAD_PROGRESS_MODAL_UPLOAD_FAILED,
          {
            erroredSamples: failedSamples.length,
            createdSamples: samples.length - failedSamples.length,
            erroredSamplesFileSizes: sampleNameToFileSizes(failedSamples),
            createdSamplesFileSizes: sampleNameToFileSizes(createdSamples),
            projectId: project.id,
            uploadType,
          },
        );
      } else {
        trackEvent(
          ANALYTICS_EVENT_NAMES.LOCAL_UPLOAD_PROGRESS_MODAL_UPLOAD_SUCCEEDED,
          {
            createdSamples: samples.length,
            createdSamplesFileSizes: sampleNameToFileSizes(samples),
            projectId: project.id,
            uploadType,
          },
        );
      }
    }
  }, [sampleUploadStatuses]);

  // Returns a map of sample names to a list of their file sizes
  const sampleNameToFileSizes = samples => {
    return samples.reduce(function(nameToFileSizes, sample) {
      nameToFileSizes[sample.name] = map(file => file.size, sample.files);
      return nameToFileSizes;
    }, {});
  };

  const updateSampleUploadStatus = (sampleName, status) => {
    setSampleUploadStatuses(prevState => ({
      ...prevState,
      [sampleName]: status,
    }));
  };

  const updateSampleUploadPercentage = (sampleName, percentage) => {
    setSampleUploadPercentages(prevState => ({
      ...prevState,
      [sampleName]: percentage,
    }));
  };

  // For AWS SDK Upload lib
  const updateSampleFilePercentage = ({
    sampleName,
    s3Key,
    percentage = 0,
    fileSize = null,
  }) => {
    const newSampleKeyState = { percentage };
    if (fileSize) {
      newSampleKeyState.size = fileSize;
    }

    const newSampleFileState = {
      ...sampleFilePercentages[sampleName],
      [s3Key]: {
        ...(sampleFilePercentages[sampleName] &&
          sampleFilePercentages[sampleName][s3Key]),
        ...newSampleKeyState,
      },
    };

    sampleFilePercentages = {
      ...sampleFilePercentages,
      [sampleName]: newSampleFileState,
    };

    updateSampleUploadPercentage(
      sampleName,
      calculatePercentageForSample(sampleFilePercentages[sampleName]),
    );
  };

  const calculatePercentageForSample = sampleFilePercentage => {
    const uploadedSize = sum(
      map(key => (key.percentage || 0) * key.size, sampleFilePercentage),
    );

    const totalSize = sum(map(progress => progress.size, sampleFilePercentage));

    return uploadedSize / totalSize;
  };

  // callbacks for uploading to pre-signed URLs
  const getUploadProgressCallbacks = () => {
    return {
      onSampleUploadProgress: (sample, percentage) => {
        updateSampleUploadPercentage(sample.name, percentage);
      },
      onSampleUploadError: handleSampleUploadError,
      onSampleUploadSuccess: sample => {
        updateSampleUploadStatus(sample.name, "success");
      },
      onMarkSampleUploadedError: handleMarkSampleUploadedError,
    };
  };

  const initiateUploadLocal = async () => {
    const samplesToUpload = addFlagsToSamples({
      adminOptions,
      clearlabs,
      medakaModel,
      samples,
      useStepFunctionPipeline,
      skipSampleProcessing,
      technology,
      workflows,
      wetlabProtocol,
    });

    const createdSamples = await initiateBulkUploadLocalWithMetadata({
      samples: samplesToUpload,
      metadata,
      callbacks: {
        onCreateSamplesError: (errors, erroredSampleNames) => {
          logError({
            message: "UploadProgressModal: onCreateSamplesError",
            details: { errors },
          });

          const uploadStatuses = zipObject(
            erroredSampleNames,
            times(constant(ERROR_STATUS), erroredSampleNames.length),
          );

          setSampleUploadStatuses(prevState => ({
            ...prevState,
            ...uploadStatuses,
          }));

          logUploadStepError({
            step: "createSamples",
            erroredSamples: erroredSampleNames.length,
            uploadType,
            errors,
          });
        },
      },
    });

    setLocallyCreatedSamples(createdSamples);

    if (allowedFeatures.includes(LOCAL_MULTIPART_UPLOADS_FEATURE)) {
      await uploadSamples(createdSamples);
    } else {
      await uploadSampleFilesToPresignedURL({
        samples: createdSamples,
        callbacks: getUploadProgressCallbacks(),
      });
    }
  };

  const uploadSamples = async samples => {
    const heartbeatInterval = startUploadHeartbeat(map("id", samples));

    await Promise.all(
      samples.map(async sample => {
        try {
          const s3ClientForSample = await getS3Client(sample);
          updateSampleUploadPercentage(sample.name, 0);

          await Promise.all(
            sample.input_files.map(async inputFile => {
              await uploadInputFileToS3(sample, inputFile, s3ClientForSample);
            }),
          );

          await completeSampleUpload({
            sample,
            onSampleUploadSuccess: sample => {
              updateSampleUploadStatus(sample.name, "success");
            },
            onMarkSampleUploadedError: handleSampleUploadError,
          });
        } catch (e) {
          handleSampleUploadError(sample, e);
          clearInterval(heartbeatInterval);
        }
      }),
    );

    clearInterval(heartbeatInterval);
    trackEvent(
      ANALYTICS_EVENT_NAMES.LOCAL_UPLOAD_PROGRESS_MODAL_UPLOADS_BATCH_HEARTBEAT_COMPLETED,
      {
        sampleIds: map("id", samples),
      },
    );
  };

  const getS3Client = async sample => {
    const credentials = await getUploadCredentials(sample.id);
    const {
      access_key_id: accessKeyId,
      aws_region: region,
      expiration,
      secret_access_key: secretAccessKey,
      session_token: sessionToken,
    } = credentials;

    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken,
        expiration,
      },
      useAccelerateEndpoint: true,
    });
  };

  const uploadInputFileToS3 = async (sample, inputFile, s3Client) => {
    const {
      name: fileName,
      s3_bucket: s3Bucket,
      s3_file_path: s3Key,
    } = inputFile;

    if (sampleFileCompleted[s3Key]) {
      return;
    }

    const body = sample.filesToUpload[fileName];
    const uploadParams = {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: body,
      ChecksumAlgorithm: ChecksumAlgorithm.SHA256,
    };

    updateSampleFilePercentage({
      sampleName: sample.name,
      s3Key,
      fileSize: body.size,
    });

    const fileUpload = new Upload({
      client: s3Client,
      leavePartsOnError: true, // configures lib to propagate errors
      params: uploadParams,
      ...(sampleFileUploadIds[s3Key] && {
        uploadId: sampleFileUploadIds[s3Key],
      }),
    });

    fileUpload.on("httpUploadProgress", progress => {
      const percentage = progress.loaded / progress.total;
      updateSampleFilePercentage({
        sampleName: sample.name,
        s3Key,
        percentage,
      });
    });

    fileUpload.onCreatedMultipartUpload(uploadId => {
      setSampleFileUploadIds(prevState => {
        return uploadId
          ? { ...prevState, [s3Key]: uploadId }
          : removeS3KeyFromUploadIds(s3Key);
      });
    });

    await fileUpload.done();

    removeS3KeyFromUploadIds(s3Key);
    setSampleFileCompleted(prevState => ({
      ...prevState,
      [s3Key]: true,
    }));
  };

  const removeS3KeyFromUploadIds = s3Key => {
    setSampleFileUploadIds(prevState => omit(s3Key, prevState));
  };

  const handleSampleUploadError = (sample, error = null) => {
    const message =
      "UploadProgressModal: Local sample upload error to S3 occured";
    logSampleUploadError({
      error,
      message,
      sample,
    });
  };

  const handleMarkSampleUploadedError = (sample, error = null) => {
    const message =
      "UploadProgressModal: An error occured when marking a sample as uploaded";
    logSampleUploadError({
      error,
      message,
      sample,
    });
  };

  const logSampleUploadError = ({ error = null, message, sample }) => {
    logError({
      message,
      details: {
        sample,
        error,
      },
    });
    updateSampleUploadStatus(sample.name, ERROR_STATUS);
    logUploadStepError({
      step: "sampleUpload",
      erroredSamples: 1,
      uploadType,
      errors: error,
    });
  };

  const getUploadPercentageForSample = sample => {
    return sampleUploadPercentages[sample.name];
  };

  const getLocalSamplesInProgress = () => {
    return filter(
      sample =>
        sampleUploadStatuses[sample.name] === undefined ||
        sampleUploadStatuses[sample.name] === IN_PROGRESS_STATUS,
      samples,
    );
  };

  const getLocalSamplesFailed = () => {
    return filter(
      sample => sampleUploadStatuses[sample.name] === ERROR_STATUS,
      samples,
    );
  };

  const retryFailedSamplesUploadToS3 = async failedSamples => {
    setRetryingSampleUpload(true);
    setUploadComplete(false);

    const failedLocallyCreatedSamples = map(failedSample => {
      updateSampleUploadStatus(failedSample.name, IN_PROGRESS_STATUS);

      if (!allowedFeatures.includes(LOCAL_MULTIPART_UPLOADS_FEATURE)) {
        updateSampleUploadPercentage(failedSample.name, 0);
      }

      return find({ name: failedSample.name }, locallyCreatedSamples);
    }, failedSamples);

    if (allowedFeatures.includes(LOCAL_MULTIPART_UPLOADS_FEATURE)) {
      await uploadSamples(failedLocallyCreatedSamples);
    } else {
      uploadSampleFilesToPresignedURL({
        samples: failedLocallyCreatedSamples,
        callbacks: getUploadProgressCallbacks(),
      });
    }
  };

  const renderSampleStatus = ({ sample, status }) => {
    if (status === ERROR_STATUS) {
      return (
        <>
          <IconAlert className={cs.alertIcon} type="error" />
          Upload failed
          <div className={cs.verticalDivider}> | </div>{" "}
          <div
            onClick={withAnalytics(
              () => retryFailedSamplesUploadToS3([sample]),
              ANALYTICS_EVENT_NAMES.LOCAL_UPLOAD_PROGRESS_MODAL_RETRY_CLICKED,
              {
                sampleName: sample.name,
              },
            )}
            className={cs.sampleRetry}
          >
            Retry
          </div>
        </>
      );
    }

    if (status === "success") {
      return (
        <div className={cs.success}>
          <IconCheckSmall className={cs.checkmarkIcon} />
          Sent to pipeline
        </div>
      );
    }

    const uploadPercentage = getUploadPercentageForSample(sample);
    if (uploadPercentage === undefined) {
      return "Waiting to upload...";
    }

    const totalSize = totalFilesSize(sample.files);
    return `Uploaded ${formatFileSize(
      totalSize * uploadPercentage,
    )} of ${formatFileSize(totalSize)}`;
  };

  const totalFilesSize = files => {
    return sum(map(file => file.size, files));
  };

  const uploadInProgressTitle = () => {
    const numLocalSamplesInProgress = size(getLocalSamplesInProgress());
    const pluralSuffix = numLocalSamplesInProgress > 1 ? "s" : "";

    return (
      <>
        <div className={cs.title}>
          {retryingSampleUpload
            ? `Restarting ${numLocalSamplesInProgress} sample upload${pluralSuffix}`
            : `Uploading ${numLocalSamplesInProgress} sample${pluralSuffix} to ${project.name}`}
        </div>
        <div className={cs.subtitle}>
          Please stay on this page until upload completes! Closing your device
          or putting it to sleep will interrupt the upload.
        </div>
      </>
    );
  };

  const failedSamplesTitle = () => {
    const numFailedSamples = size(getLocalSamplesFailed());
    const title =
      Object.keys(sampleUploadStatuses).length === numFailedSamples
        ? "All uploads failed"
        : `Uploads completed with ${numFailedSamples} error${
            numFailedSamples > 1 ? "s" : ""
          }`;

    return (
      <>
        <div className={cs.titleWithIcon}>{title}</div>
        {numFailedSamples === size(samples) && (
          <div className={cs.subtitle}>
            <a
              className={cs.helpLink}
              href="mailto:help@czid.org"
              onClick={() =>
                trackEvent(
                  ANALYTICS_EVENT_NAMES.LOCAL_UPLOAD_PROGRESS_MODAL_CONTACT_US_LINK_CLICKED,
                )
              }
            >
              Contact us for help
            </a>
          </div>
        )}
      </>
    );
  };

  const renderTitle = () => {
    const numLocalSamplesInProgress = size(getLocalSamplesInProgress());
    // While local samples are being uploaded.
    if (numLocalSamplesInProgress) {
      return uploadInProgressTitle();
    } else if (!isEmpty(getLocalSamplesFailed())) {
      return failedSamplesTitle();
    } else {
      return <div className={cs.titleWithIcon}>Uploads completed!</div>;
    }
  };

  const renderRetryAllFailedNotification = () => {
    const localSamplesFailed = getLocalSamplesFailed();
    const numberOfLocalSamplesFailed = size(localSamplesFailed);

    return (
      <Notification
        className={cs.notificationContainer}
        type="error"
        displayStyle="flat"
      >
        <div className={cs.content}>
          <div className={cs.errorMessage}>
            {numberOfLocalSamplesFailed} upload
            {numberOfLocalSamplesFailed > 1 && "s"} ha
            {numberOfLocalSamplesFailed > 1 ? "ve" : "s"} failed
          </div>
          <div className={cs.fill} />
          <div
            className={cx(cs.sampleRetry, cs.retryAll)}
            onClick={withAnalytics(
              () => retryFailedSamplesUploadToS3(localSamplesFailed),
              ANALYTICS_EVENT_NAMES.LOCAL_UPLOAD_PROGRESS_MODAL_RETRY_ALL_FAILED_CLICKED,
              {
                numberOfLocalSamplesFailed,
              },
            )}
          >
            Retry all failed
          </div>
        </div>
      </Notification>
    );
  };

  const renderViewProjectButton = () => {
    const buttonCallback = () => {
      trackEvent(
        ANALYTICS_EVENT_NAMES.LOCAL_UPLOAD_PROGRESS_MODAL_GO_TO_PROJECT_BUTTON_CLICKED,
        {
          projectId: project.id,
          projectName: project.name,
        },
      );
      if (!isEmpty(getLocalSamplesFailed())) {
        setConfirmationModalOpen(true);
      } else {
        redirectToProject(project.id);
      }
    };

    return (
      <PrimaryButton text="Go to Project" onClick={() => buttonCallback()} />
    );
  };

  return (
    <Modal
      open
      tall
      narrow
      className={cx(
        cs.uploadProgressModal,
        uploadComplete && cs.uploadComplete,
      )}
    >
      <div className={cs.header}>
        <ImgUploadPrimary className={cs.uploadImg} />
        {renderTitle()}
        {!isEmpty(getLocalSamplesFailed()) &&
          renderRetryAllFailedNotification()}
      </div>
      <div className={cs.sampleList}>
        {samples.map(sample => {
          const status = sampleUploadStatuses[sample.name];

          return (
            <div key={sample.name} className={cs.sample}>
              <div className={cs.sampleHeader}>
                <div className={cs.sampleName}>{sample.name}</div>
                <div className={cs.fill} />
                <div className={cs.sampleStatus}>
                  {renderSampleStatus({ sample, status })}
                </div>
              </div>
              <LoadingBar
                percentage={getUploadPercentageForSample(sample)}
                error={status === ERROR_STATUS}
              />
            </div>
          );
        })}
      </div>
      {!retryingSampleUpload && uploadComplete && (
        <div className={cs.footer}>{renderViewProjectButton()}</div>
      )}
      {confirmationModalOpen && (
        <UploadConfirmationModal
          numberOfFailedSamples={size(getLocalSamplesFailed())}
          onCancel={() => {
            trackEvent(
              ANALYTICS_EVENT_NAMES.UPLOAD_CONFIRMATION_MODAL_RETURN_TO_UPLOAD_BUTTON_CLICKED,
              {
                numberOfTotalSamples: size(samples),
                numberOfFailedSamples: size(getLocalSamplesFailed),
              },
            );
            setConfirmationModalOpen(false);
          }}
          onConfirm={() => {
            trackEvent(
              ANALYTICS_EVENT_NAMES.UPLOAD_CONFIRMATION_MODAL_LEAVE_UPLOAD_BUTTON_CLICKED,
              {
                numberOfTotalSamples: size(samples),
                numberOfFailedSamples: size(getLocalSamplesFailed),
              },
            );

            redirectToProject(project.id);
          }}
          open
        />
      )}
    </Modal>
  );
};

LocalUploadProgressModal.propTypes = {
  samples: PropTypes.arrayOf(
    PropTypes.shape({
      host_genome_id: PropTypes.number.isRequired,
      input_file_attributes: PropTypes.shape({
        name: PropTypes.string,
        source: PropTypes.string,
        source_type: PropTypes.string,
        upload_client: PropTypes.string,
      }),
      name: PropTypes.string,
      project_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      status: PropTypes.string,
    }),
  ),
  adminOptions: PropTypes.objectOf(PropTypes.string).isRequired,
  clearlabs: PropTypes.bool,
  medakaModel: PropTypes.string,
  metadata: PropTypes.objectOf(PropTypes.any),
  onUploadComplete: PropTypes.func.isRequired,
  project: PropTypes.Project,
  skipSampleProcessing: PropTypes.bool,
  technology: PropTypes.string,
  uploadType: PropTypes.string.isRequired,
  useStepFunctionPipeline: PropTypes.bool,
  wetlabProtocol: PropTypes.string,
  workflows: PropTypes.instanceOf(Set),
};

export default LocalUploadProgressModal;
