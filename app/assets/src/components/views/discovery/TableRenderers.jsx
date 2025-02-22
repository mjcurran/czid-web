import cx from "classnames";
import { at, isNil, get } from "lodash/fp";
import moment from "moment";
import React from "react";

import BasicPopup from "~/components/BasicPopup";
import { numberWithCommas } from "~/helpers/strings";
import { IconSamplePrivate, IconSamplePublic } from "~ui/icons";
import IconSample from "~ui/icons/IconSample";
import StatusLabel from "~ui/labels/StatusLabel";

// CSS file must be loaded after any elements you might want to override
import cs from "./table_renderers.scss";

const STATUS_TYPE = {
  complete: "success",
  failed: "error",
  "complete - issue": "warning",
  "complete*": "warning",
  "post processing": "default",
  "host filtering": "default",
  alignment: "default",
  waiting: "default",
  skipped: "info",
};

class TableRenderers extends React.Component {
  static renderItemDetails = ({
    cellData: item,
    detailsRenderer,
    descriptionRenderer,
    nameRenderer,
    visibilityIconRenderer,
  }) => {
    let icon = visibilityIconRenderer(item);
    return (
      <div className={cs.item}>
        <div className={cs.visibility}>
          {icon &&
            React.cloneElement(icon, {
              className: `${cx(cs.icon, icon.props.className)}`,
            })}
        </div>
        <div className={cs.itemRightPane}>
          <BasicPopup
            trigger={<div className={cs.itemName}>{nameRenderer(item)}</div>}
            content={nameRenderer(item)}
          />
          {descriptionRenderer && item && item.description && (
            <BasicPopup
              trigger={
                <div className={cs.itemDescription}>
                  {descriptionRenderer(item)}
                </div>
              }
              content={descriptionRenderer(item)}
              wide="very"
              inverted={false}
            />
          )}
          <div className={cs.itemDetails}>{detailsRenderer(item)}</div>
        </div>
      </div>
    );
  };

  static renderSampleCounts = ({ cellData: counts }) => {
    const [numberOfSamples, mngsAnalysisRunsCount, cgAnlaysisRunsCount] = at(
      ["number_of_samples", "mngs_runs_count", "cg_runs_count"],
      counts,
    );

    const hasAllCounts =
      !isNil(numberOfSamples) &&
      !isNil(mngsAnalysisRunsCount) &&
      !isNil(cgAnlaysisRunsCount);
    return (
      hasAllCounts && (
        <div className={cs.counts}>
          <div className={cs.sampleCount}>{`${numberOfSamples} Sample${
            numberOfSamples !== 1 ? "s" : ""
          }`}</div>
          <div className={cs.analysesCounts}>
            {`${mngsAnalysisRunsCount} mNGS`} | {`${cgAnlaysisRunsCount} CG`}
          </div>
        </div>
      )
    );
  };

  static baseRenderer = data => {
    return <div className={cs.base}>{data}</div>;
  };

  static renderList = ({ cellData: list }) => {
    return TableRenderers.baseRenderer(
      list && list.length > 0 ? list.join(", ") : "",
    );
  };

  static renderDate = ({ cellData: date }) => {
    return (
      <div className={cs.date}>
        {date ? moment(date).format("YYYY-MM-DD") : ""}
      </div>
    );
  };

  static renderDateWithElapsed = ({ cellData: date }) => {
    return (
      <div className={cs.dateContainer}>
        {TableRenderers.renderDate({ cellData: date })}
        <div className={cs.elapsed}>{date ? moment(date).fromNow() : ""}</div>
      </div>
    );
  };

  static renderSampleInfo = ({ rowData, full = true, basicIcon = false }) => {
    const sample = get("sample", rowData);
    const sampleName = get("name", sample);
    let status;

    if (sample) {
      if (sample.uploadError) status = sample.uploadError;
      // If the sample does not have an upload error, set status to the workflow run status.
      else status = get("status", rowData);
    }

    return (
      <div className={cs.sample}>
        {full && (
          <div className={cs.visibility}>
            {sample &&
              (basicIcon ? (
                <IconSample className={cx(cs.iconSample)} />
              ) : sample.publicAccess ? (
                <IconSamplePublic className={cx(cs.icon)} />
              ) : (
                <IconSamplePrivate className={cx(cs.icon)} />
              ))}
          </div>
        )}
        <div className={cs.sampleRightPane}>
          {sample ? (
            <div className={cs.sampleNameAndStatus}>
              <BasicPopup
                trigger={<div className={cs.sampleName}>{sampleName}</div>}
                content={sampleName}
              />
              <StatusLabel
                className={cs.sampleStatus}
                status={status}
                type={STATUS_TYPE[status]}
              />
            </div>
          ) : (
            <div className={cs.sampleNameAndStatus} />
          )}
          {sample ? (
            <div className={cs.sampleDetails}>
              <span className={cs.user}>{sample.user}</span>|
              <span className={cs.project}>{sample.project}</span>
            </div>
          ) : (
            <div className={cs.sampleDetails} />
          )}
        </div>
      </div>
    );
  };

  static renderSample = ({ sample, full = true, basicIcon = false }) => {
    const sampleName = get("name", sample);
    let sampleStatus;

    if (sample) {
      sampleStatus = sample.uploadError
        ? sample.uploadError
        : sample.pipelineRunStatus;
    }

    return (
      <div className={cs.sample}>
        {full && (
          <div className={cs.visibility}>
            {sample &&
              (basicIcon ? (
                <IconSample className={cx(cs.iconSample)} />
              ) : sample.publicAccess ? (
                <IconSamplePublic className={cx(cs.icon)} />
              ) : (
                <IconSamplePrivate className={cx(cs.icon)} />
              ))}
          </div>
        )}
        <div className={cs.sampleRightPane}>
          {sample ? (
            <div className={cs.sampleNameAndStatus}>
              <BasicPopup
                trigger={<div className={cs.sampleName}>{sampleName}</div>}
                content={sampleName}
              />
              <StatusLabel
                className={cs.sampleStatus}
                status={sampleStatus}
                type={STATUS_TYPE[sampleStatus]}
              />
            </div>
          ) : (
            <div className={cs.sampleNameAndStatus} />
          )}
          {sample ? (
            <div className={cs.sampleDetails}>
              <span className={cs.user}>{sample.user}</span>|
              <span className={cs.project}>{sample.project}</span>
            </div>
          ) : (
            <div className={cs.sampleDetails} />
          )}
        </div>
      </div>
    );
  };

  static renderReferenceGenome = cellData => {
    const accessionName = get("accessionName", cellData);
    const referenceGenomeId = get("referenceGenomeId", cellData);
    const taxonName = get("taxonName", cellData);

    const content = (
      <div>
        <div className={cs.title}>
          {referenceGenomeId} - {accessionName}
        </div>
        <div className={cs.details}>{taxonName}</div>
      </div>
    );

    return (
      <BasicPopup
        basic={false}
        trigger={
          <div className={cs.referenceGenome}>
            {referenceGenomeId && content}
          </div>
        }
        content={
          <div className={cs.referenceGenomeTooltip}>
            {referenceGenomeId && content}
          </div>
        }
      />
    );
  };

  static renderVisualization = ({
    cellData: item,
    detailsRenderer,
    nameRenderer,
    statusRenderer,
    visibilityIconRenderer,
  }) => {
    let icon = visibilityIconRenderer(item);
    return (
      <div className={cs.visualization}>
        <div className={cs.visibility}>
          {icon &&
            React.cloneElement(icon, {
              className: `${cx(cs.icon, icon.props.className)}`,
            })}
        </div>
        <div className={cs.vizRightPane}>
          <div className={cs.vizNameAndStatus}>
            <BasicPopup
              trigger={<div className={cs.vizName}>{nameRenderer(item)}</div>}
              content={nameRenderer(item)}
            />
            {statusRenderer && item && item.status && (
              <div className={cs.vizStatus}>{statusRenderer(item)}</div>
            )}
          </div>
          <div className={cs.vizDetails}>{detailsRenderer(item)}</div>
        </div>
      </div>
    );
  };

  static formatNumberWithCommas = value => {
    return numberWithCommas(value);
  };

  static renderNumberAndPercentage = ({ cellData: number }) => {
    return (
      <div className={cs.numberValueAndPercentage}>
        <div className={cs.value}>
          {number && numberWithCommas(number.value)}
        </div>
        <div className={cs.percentage}>
          {number && TableRenderers.formatPercentage(number.percent)}
        </div>
      </div>
    );
  };

  static formatNumber = value => {
    if (!value) return value;
    if (!isFinite(value)) return value;
    return value.toFixed(2);
  };

  static formatPercentage = value => {
    if (!value) return value;
    const rounded = TableRenderers.formatNumber(value);
    return rounded < 0.01 ? "<0.01%" : `${rounded}%`;
  };

  static formatDuration = runtime => {
    const h = Math.floor(runtime / 3600);
    const m = Math.floor((runtime % 3600) / 60);

    const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m === 1 ? " minute" : " minutes") : "";
    return hDisplay + mDisplay;
  };

  static format10BaseExponent = logValue => {
    if (!logValue) return logValue;
    const roundedInteger = Math.round(logValue);
    return (
      <div className={cs.exponent}>
        10<sup>{roundedInteger}</sup>
      </div>
    );
  };
}

export default TableRenderers;
