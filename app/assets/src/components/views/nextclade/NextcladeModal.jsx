import cx from "classnames";
import { difference, size } from "lodash/fp";
import PropTypes from "prop-types";
import React from "react";

import { createConsensusGenomeCladeExport, getWorkflowRunsInfo } from "~/api";
import { validateWorkflowRunIds } from "~/api/access_control";
import { trackEvent, ANALYTICS_EVENT_NAMES } from "~/api/analytics";
import { UserContext } from "~/components/common/UserContext";
import List from "~/components/ui/List";
import ErrorModal from "~/components/ui/containers/ErrorModal";
import { IconInfoSmall } from "~/components/ui/icons";
import {
  NEXTCLADE_APP_LINK,
  NEXTCLADE_REFERENCE_TREE_LINK,
} from "~/components/utils/documentationLinks";
import { SARS_COV_2 } from "~/components/views/samples/SamplesView/constants";
import ColumnHeaderTooltip from "~ui/containers/ColumnHeaderTooltip";
import Modal from "~ui/containers/Modal";
import { openUrlInNewTab } from "~utils/links";
import { WORKFLOWS } from "~utils/workflows";
import NextcladeConfirmationModal from "./NextcladeConfirmationModal";
import NextcladeModalFooter from "./NextcladeModalFooter";
import NextcladeReferenceTreeOptions from "./NextcladeReferenceTreeOptions";

import cs from "./nextclade_modal.scss";

export default class NextcladeModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      confirmationModalOpen: false,
      errorModalOpen: false,
      invalidSampleNames: [],
      loading: true,
      loadingResults: false,
      nonSarsCov2SampleNames: [],
      projectIds: [],
      referenceTree: null,
      selectedTreeType: "global",
      validationError: null,
      validWorkflowRunIds: new Set(),
      validWorkflowInfo: [],
    };
  }

  componentDidMount() {
    this.fetchValidationInfo();
  }

  fetchValidationInfo = async () => {
    const { selectedIds } = this.props;

    const {
      validIds,
      invalidSampleNames,
      error,
    } = await validateWorkflowRunIds({
      basic: false,
      workflowRunIds: Array.from(selectedIds),
      workflow: WORKFLOWS.CONSENSUS_GENOME.value,
    });

    const { workflowRunInfo } = await getWorkflowRunsInfo(validIds);

    const projectIds = workflowRunInfo.map(workflow => workflow.projectId);

    const nonSarsCov2SampleNames = workflowRunInfo
      .filter(cg => cg.taxonName !== SARS_COV_2)
      .map(cg => cg.name);

    this.setState(
      {
        invalidSampleNames,
        loading: false,
        nonSarsCov2SampleNames,
        validationError: error,
        validWorkflowRunIds: new Set(validIds),
        validWorkflowInfo: workflowRunInfo,
        projectIds: projectIds,
      },
      this.checkAdminSelections,
    );
  };

  checkAdminSelections = () => {
    const { admin, userId } = this.context || {};
    const { validWorkflowInfo } = this.state;

    if (admin) {
      const selectedOwnerIds = validWorkflowInfo.map(
        workflow => workflow.userId,
      );
      if (difference(selectedOwnerIds, [userId]).length) {
        window.alert(
          "Admin warning: You have selected consensus genomes that belong to other users. Double-check that you have permission to send to Nextclade for production consensus genomes.",
        );
      }
    }
  };

  openExportLink = async () => {
    const {
      validWorkflowRunIds,
      referenceTreeContents,
      selectedTreeType,
    } = this.state;
    const link = await createConsensusGenomeCladeExport({
      workflowRunIds: Array.from(validWorkflowRunIds),
      referenceTree:
        selectedTreeType === "upload" ? referenceTreeContents : null,
    });
    openUrlInNewTab(link.external_url);
  };

  handleFileUpload = async file => {
    const fileContents = await this.readUploadedFile(file);
    this.setState({
      referenceTree: file,
      referenceTreeContents: fileContents,
    });
  };

  readUploadedFile = inputFile => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onerror = () => {
        reader.abort();
        reject(reader.error);
      };

      reader.onload = () => {
        // stringify-parse to remove excess whitespace
        resolve(JSON.stringify(JSON.parse(reader.result)));
      };
      reader.readAsText(inputFile);
    });
  };

  handleSelectTreeType = selectedTreeType => {
    this.setState({
      selectedTreeType,
    });
  };

  renderTooltip = ({
    content,
    link,
    iconStyle = null,
    offset = [0, 0],
    position = "top center",
  }) => {
    return (
      <ColumnHeaderTooltip
        trigger={
          <IconInfoSmall className={cx(cs.infoIcon, iconStyle && iconStyle)} />
        }
        content={content}
        link={link}
        offset={offset}
        position={position}
      />
    );
  };

  handleConfirmationModalOpen = () => {
    this.setState({ confirmationModalOpen: true });
  };

  handleConfirmationModalClose = () => {
    const { projectIds, validWorkflowRunIds, selectedTreeType } = this.state;

    trackEvent(
      ANALYTICS_EVENT_NAMES.NEXTCLADE_MODAL_CONFIRMATION_MODAL_CANCEL_BUTTON_CLICKED,
      {
        workflowRunIds: Array.from(validWorkflowRunIds),
        selectedTreeType,
        projectIds,
      },
    );

    this.setState({ confirmationModalOpen: false });
  };

  handleConfirmationModalConfirm = async () => {
    const { onClose } = this.props;
    const { projectIds, validWorkflowRunIds, selectedTreeType } = this.state;

    try {
      this.setState({ loadingResults: true }, () => {
        trackEvent(
          ANALYTICS_EVENT_NAMES.NEXTCLADE_MODAL_CONFIRMATION_MODAL_CONFIRM_BUTTON_CLICKED,
          {
            workflowRunIds: Array.from(validWorkflowRunIds),
            selectedTreeType,
            projectIds,
          },
        );
      });

      await this.openExportLink();
      this.setState({ confirmationModalOpen: false }, () => {
        onClose();
      });
    } catch (error) {
      this.setState(
        {
          confirmationModalOpen: false,
          errorModalOpen: true,
          loadingResults: false,
        },
        () => {
          console.error(error);
          trackEvent(ANALYTICS_EVENT_NAMES.NEXTCLADE_MODAL_UPLOAD_FAILED, {
            error,
            workflowRunIds: Array.from(validWorkflowRunIds),
            selectedTreeType,
            projectIds,
          });
        },
      );
    }
  };

  handleErrorModalRetry = async () => {
    const { onClose } = this.props;
    const { projectIds, validWorkflowRunIds, selectedTreeType } = this.state;

    try {
      await this.openExportLink();
      this.setState({ errorModalOpen: false }, () => {
        onClose();
        trackEvent(
          ANALYTICS_EVENT_NAMES.NEXTCLADE_MODAL_CONFIRMATION_MODAL_RETRY_BUTTON_CLICKED,
          {
            workflowRunIds: Array.from(validWorkflowRunIds),
            selectedTreeType,
            projectIds,
          },
        );
      });
    } catch (error) {
      console.error(error);
      trackEvent(ANALYTICS_EVENT_NAMES.NEXTCLADE_MODAL_RETRY_UPLOAD_FAILED, {
        error,
        workflowRunIds: Array.from(validWorkflowRunIds),
        selectedTreeType,
        projectIds,
      });
    }
  };

  handleErrorModalClose = () => {
    this.setState({ errorModalOpen: false });
  };

  render() {
    const { open, onClose, selectedIds } = this.props;
    const {
      confirmationModalOpen,
      errorModalOpen,
      invalidSampleNames,
      loading,
      loadingResults,
      nonSarsCov2SampleNames,
      referenceTree,
      validationError,
      validWorkflowRunIds,
      selectedTreeType,
    } = this.state;

    return (
      <Modal narrow open={open} tall onClose={onClose}>
        <div className={cs.modal}>
          <div className={cs.nextcladeHeader}>
            <div className={cs.title}>
              View Consensus Genomes in Nextclade
              {this.renderTooltip({
                content:
                  "Nextclade is a third-party tool and has its own policies.",
                link: NEXTCLADE_APP_LINK,
              })}
            </div>
            <div className={cs.tagline}>
              {size(selectedIds)} Consensus Genome
              {size(selectedIds) !== 1 ? "s" : ""} selected
            </div>
          </div>
          <div className={cs.nextcladeDescription}>
            <div className={cs.title}> Nextclade helps you: </div>
            <List
              listItems={[
                `Assess sequence quality`,
                `See where your consensus genomes differ from the reference sequence`,
                `Identify which clade or lineage your consensus genomes belong to`,
                <>
                  View consensus genome placement in the context of a Nextstrain{" "}
                  <br />
                  phylogenetic tree
                  {this.renderTooltip({
                    content:
                      "Exercise caution when interpreting this tree. Nextclade’s algorithms are meant for quick assessments and not a replacement for full analysis with the Nextstrain pipeline.",
                    iconStyle: cs.lower,
                    position: "top right",
                    offset: [11, 0],
                  })}
                </>,
              ]}
            />
          </div>
          <div className={cs.referenceTree}>
            <div className={cs.title}>
              Reference Tree
              {this.renderTooltip({
                content:
                  "Nextclade will graft your sequences onto the reference tree to provide more context.",
                link: NEXTCLADE_REFERENCE_TREE_LINK,
                iconStyle: cs.lower,
              })}
            </div>
            <div className={cs.options}>
              <NextcladeReferenceTreeOptions
                referenceTree={referenceTree && referenceTree.name}
                onChange={this.handleFileUpload}
                onSelect={this.handleSelectTreeType}
                selectedType={selectedTreeType}
              />
            </div>
          </div>
          <div className={cs.footer}>
            <NextcladeModalFooter
              onClick={this.handleConfirmationModalOpen}
              invalidSampleNames={invalidSampleNames}
              loading={loading}
              nonSarsCov2SampleNames={nonSarsCov2SampleNames}
              validationError={validationError}
              hasValidIds={validWorkflowRunIds && validWorkflowRunIds.size > 0}
            />
          </div>
        </div>
        {confirmationModalOpen && (
          <NextcladeConfirmationModal
            open
            onCancel={this.handleConfirmationModalClose}
            onConfirm={this.handleConfirmationModalConfirm}
            loading={loadingResults}
          />
        )}
        {errorModalOpen && (
          <ErrorModal
            helpLinkEvent={
              ANALYTICS_EVENT_NAMES.NEXTCLADE_MODAL_ERROR_MODAL_HELP_LINK_CLICKED
            }
            labelText="Failed to send"
            open
            onCancel={this.handleErrorModalClose}
            onConfirm={this.handleErrorModalRetry}
            title={
              "Sorry! There was an error sending your consensus genomes to Nextclade."
            }
          />
        )}
      </Modal>
    );
  }
}

NextcladeModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  selectedIds: PropTypes.instanceOf(Set),
  workflowEntity: PropTypes.string,
};

NextcladeModal.contextType = UserContext;
