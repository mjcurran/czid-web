import cx from "classnames";
import React from "react";

import { ANALYTICS_EVENT_NAMES, trackEvent } from "~/api/analytics";
import ExternalLink from "~/components/ui/controls/ExternalLink";
import SectionsDropdown from "~/components/ui/controls/dropdowns/SectionsDropdown";
import { IconInfoSmall } from "~/components/ui/icons";
import {
  ARTIC_PIPELINE_LINK,
  CG_ILLUMINA_PIPELINE_GITHUB_LINK,
  UPLOAD_SAMPLE_PIPELINE_OVERVIEW_LINK,
} from "~/components/utils/documentationLinks";
import ColumnHeaderTooltip from "~ui/containers/ColumnHeaderTooltip";
import RadioButton from "~ui/controls/RadioButton";
import Toggle from "~ui/controls/Toggle";
import Dropdown from "~ui/controls/dropdowns/Dropdown";
import IconSample from "~ui/icons/IconSample";
import PropTypes from "~utils/propTypes";
import { WORKFLOWS } from "~utils/workflows";

import {
  CG_WETLAB_OPTIONS,
  CG_TECHNOLOGY_OPTIONS,
  CG_NANOPORE_WETLAB_OPTIONS,
  MEDAKA_MODEL_OPTIONS,
} from "./constants";
import cs from "./workflow_selector.scss";

const WorkflowSelector = ({
  onClearLabsChange,
  onMedakaModelChange,
  onTechnologyToggle,
  onWetlabProtocolChange,
  onWorkflowToggle,
  selectedMedakaModel,
  selectedTechnology,
  selectedWetlabProtocol,
  selectedWorkflows,
  usedClearLabs,
}) => {
  const createExternalLink = ({
    additionalStyle = null,
    analyticsEventName,
    content,
    link,
  }) => (
    <ExternalLink
      href={link}
      analyticsEventName={analyticsEventName}
      className={cx(cs.externalLink, additionalStyle && additionalStyle)}
    >
      {content}
    </ExternalLink>
  );

  const renderWetlabSelector = technology => {
    return (
      <div className={cs.item}>
        <div className={cs.subheader}>Wetlab Protocol&#58;</div>
        <Dropdown
          className={cs.dropdown}
          onChange={value => {
            onWetlabProtocolChange(value);
            trackEvent("WorkflowSelector_wetlab-protocol_selected", {
              wetlabOption: value,
            });
          }}
          options={
            technology === CG_TECHNOLOGY_OPTIONS.ILLUMINA
              ? CG_WETLAB_OPTIONS
              : CG_NANOPORE_WETLAB_OPTIONS
          }
          placeholder="Select"
          value={selectedWetlabProtocol}
        ></Dropdown>
      </div>
    );
  };

  const renderMngsAnalysisType = () => {
    const mngsWorkflowSelected = selectedWorkflows.has(
      WORKFLOWS.SHORT_READ_MNGS.value,
    );
    return (
      <div
        className={cx(cs.selectableOption, mngsWorkflowSelected && cs.selected)}
        onClick={() => onWorkflowToggle(WORKFLOWS.SHORT_READ_MNGS.value)}
      >
        <RadioButton
          selected={mngsWorkflowSelected}
          className={cs.radioButton}
        />
        <IconSample className={cs.iconSample} />
        <div className={cs.optionText}>
          <div className={cs.title}>Metagenomics</div>
          <div className={cs.description}>
            Run your samples through our metagenomics pipeline. Our pipeline
            only supports Illumina.
          </div>
        </div>
      </div>
    );
  };

  const renderCGAnalysisType = () => {
    const cgWorkflowSelected = selectedWorkflows.has(
      WORKFLOWS.CONSENSUS_GENOME.value,
    );
    return (
      <div
        className={cx(cs.selectableOption, cgWorkflowSelected && cs.selected)}
        onClick={() => onWorkflowToggle(WORKFLOWS.CONSENSUS_GENOME.value)}
      >
        <RadioButton selected={cgWorkflowSelected} className={cs.radioButton} />
        <IconSample className={cs.iconSample} />
        <div className={cs.optionText}>
          <div className={cs.title}>SARS-CoV-2 Consensus Genome</div>
          <div className={cs.description}>
            Run your samples through our Illumina or Nanopore supported
            pipelines to get consensus genomes for SARS-CoV-2.
          </div>
          {cgWorkflowSelected && renderTechnologyOptions()}
        </div>
      </div>
    );
  };

  const renderTechnologyOptions = () => {
    return (
      <div className={cs.optionText}>
        <div className={cx(cs.title, cs.technologyTitle)}>
          Sequencing Platform:
          <div className={cs.technologyOptions}>
            {renderIlluminaOption()}
            {renderNanoporeOption()}
          </div>
        </div>
      </div>
    );
  };

  const renderIlluminaOption = () => {
    const illuminaTechnologyOptionSelected =
      selectedTechnology === CG_TECHNOLOGY_OPTIONS.ILLUMINA;

    return (
      <div
        className={cx(
          cs.selectableOption,
          cs.technology,
          illuminaTechnologyOptionSelected && cs.selected,
        )}
        onClick={() => onTechnologyToggle(CG_TECHNOLOGY_OPTIONS.ILLUMINA)}
      >
        <RadioButton
          selected={illuminaTechnologyOptionSelected}
          className={cx(cs.radioButton, cs.alignTitle)}
        />
        <div className={cs.optionText}>
          <div className={cs.title}>Illumina</div>
          <div className={cs.technologyDescription}>
            You can check out the Illumina pipeline on GitHub{" "}
            {createExternalLink({
              analyticsEventName:
                ANALYTICS_EVENT_NAMES.UPLOAD_SAMPLE_CG_ILLUMINA_PIPELINE_GITHUB_LINK_CLICKED,
              content: "here",
              link: CG_ILLUMINA_PIPELINE_GITHUB_LINK,
            })}
            .
          </div>
          <div className={cs.technologyContent}>
            {selectedWorkflows.has(WORKFLOWS.CONSENSUS_GENOME.value) &&
              illuminaTechnologyOptionSelected &&
              renderWetlabSelector(CG_TECHNOLOGY_OPTIONS.ILLUMINA)}
          </div>
        </div>
      </div>
    );
  };

  const renderNanoporeContent = () => (
    <div className={cs.technologyContent}>
      <div className={cs.item}>
        <div className={cs.subheader}>
          Used Clear Labs:
          <ColumnHeaderTooltip
            trigger={<IconInfoSmall className={cs.infoIcon} />}
            content={
              "Pipeline will be adjusted to accomodate Clear Lab fastq files which have undergone the length filtering and trimming steps."
            }
            position={"top center"}
            link={"https://www.clearlabs.com/"}
          />
        </div>
        <div className={cs.description} onClick={e => e.stopPropagation()}>
          <Toggle
            className={cs.toggle}
            initialChecked={usedClearLabs}
            onLabel={"Yes"}
            offLabel={"No"}
            onChange={label => onClearLabsChange(label === "Yes")}
          />
        </div>
      </div>

      {/* If uploading ClearLabs samples, only allow default wetlab and medaka model options. */}
      {!usedClearLabs ? (
        <>
          {renderWetlabSelector(CG_TECHNOLOGY_OPTIONS.NANOPORE)}
          <div className={cs.item}>
            <div className={cs.subheader}>
              Medaka Model:
              <ColumnHeaderTooltip
                trigger={<IconInfoSmall className={cs.infoIcon} />}
                content={
                  "For best results, specify the correct model. Where a version of Guppy has been used without a corresponding model, choose a model with the highest version equal to or less than the Guppy version."
                }
                position={"top center"}
                link={UPLOAD_SAMPLE_PIPELINE_OVERVIEW_LINK}
              />
            </div>
            <SectionsDropdown
              className={cs.dropdown}
              menuClassName={cs.dropdownMenu}
              fluid
              categories={MEDAKA_MODEL_OPTIONS}
              onChange={val => onMedakaModelChange(val)}
              selectedValue={selectedMedakaModel}
            />
          </div>
        </>
      ) : (
        <>
          <div className={cs.item}>
            <div className={cs.subheader}>Wetlab Protocol&#58;</div>
            <div className={cx(cs.description, cs.text)}>ARTIC v3</div>
          </div>
          <div className={cs.item}>
            <div className={cs.subheader}>
              Medaka Model:
              <ColumnHeaderTooltip
                trigger={<IconInfoSmall className={cs.infoIcon} />}
                content={
                  "Medaka is a tool to create consensus sequences and variant calls from Nanopore sequencing data."
                }
                position={"top center"}
              />
            </div>
            <div className={cx(cs.description, cs.text)}>
              r941_min_high_g360
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderNanoporeOption = () => {
    const nanoporeTechnologyOptionSelected =
      selectedTechnology === CG_TECHNOLOGY_OPTIONS.NANOPORE;
    return (
      <div
        className={cx(
          cs.selectableOption,
          cs.technology,
          nanoporeTechnologyOptionSelected && cs.selected,
        )}
        onClick={() => onTechnologyToggle(CG_TECHNOLOGY_OPTIONS.NANOPORE)}
      >
        <RadioButton
          selected={nanoporeTechnologyOptionSelected}
          className={cx(cs.radioButton, cs.alignTitle)}
        />
        <div className={cs.optionText}>
          <div className={cs.title}>Nanopore</div>
          <div className={cs.technologyDescription}>
            We are using the ARTIC network’s nCoV-2019 novel coronavirus
            bioinformatics protocol for nanopore sequencing, which can be found{" "}
            {createExternalLink({
              analyticsEventName:
                ANALYTICS_EVENT_NAMES.UPLOAD_SAMPLE_STEP_CG_ARTIC_PIPELINE_LINK_CLICKED,
              content: "here",
              link: ARTIC_PIPELINE_LINK,
            })}
            .
          </div>
          {nanoporeTechnologyOptionSelected && renderNanoporeContent()}
        </div>
      </div>
    );
  };

  return (
    <div className={cs.workflowSelector}>
      <div className={cs.header}>Analysis Type</div>
      {renderMngsAnalysisType()}
      {renderCGAnalysisType()}
    </div>
  );
};

WorkflowSelector.propTypes = {
  onClearLabsChange: PropTypes.func,
  onMedakaModelChange: PropTypes.func,
  onTechnologyToggle: PropTypes.func,
  onWetlabProtocolChange: PropTypes.func,
  onWorkflowToggle: PropTypes.func,
  selectedMedakaModel: PropTypes.string,
  selectedTechnology: PropTypes.string,
  selectedWetlabProtocol: PropTypes.string,
  selectedWorkflows: PropTypes.instanceOf(Set),
  usedClearLabs: PropTypes.bool,
};

export default WorkflowSelector;
