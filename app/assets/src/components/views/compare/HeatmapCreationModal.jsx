import { isEqual, isNull, size, startCase } from "lodash/fp";
import PropTypes from "prop-types";
import React from "react";

import { getBackgrounds, getMassNormalizedBackgroundAvailability } from "~/api";
import { withAnalytics, ANALYTICS_EVENT_NAMES } from "~/api/analytics";
import { UserContext } from "~/components/common/UserContext";
import PrimaryButton from "~/components/ui/controls/buttons/PrimaryButton";
import SecondaryButton from "~/components/ui/controls/buttons/SecondaryButton";
import { CATEGORIES } from "~/components/views/SampleView/constants";
import {
  SPECIFICITY_OPTIONS,
  SPECIES_SELECTION_OPTIONS,
  THRESHOLDS,
} from "~/components/views/compare/SamplesHeatmapView/constants";
import BackgroundModelFilter from "~/components/views/report/filters/BackgroundModelFilter";
import { getURLParamString } from "~/helpers/url";
import Modal from "~ui/containers/Modal";
import {
  Dropdown,
  MultipleNestedDropdown,
  ThresholdFilterDropdown,
} from "~ui/controls/dropdowns";
import { openUrl, openUrlInNewTab } from "~utils/links";

import cs from "./heatmap_creation_modal.scss";

export default class HeatmapCreationModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      backgroundOptions: [],
      enableMassNormalizedBackgrounds: false,
      selectedBackground: 26, // default background id
      selectedCategories: [],
      selectedSpecificity: null,
      selectedSubcategories: {},
      selectedTaxonLevel: null,
      selectedThresholdFilters: [],
    };
  }

  componentDidMount() {
    this.fetchBackgrounds();
    this.fetchBackgroundAvailability();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.selectedIds !== this.props.selectedIds) {
      this.fetchBackgroundAvailability();
    }
  }

  async fetchBackgrounds() {
    const { backgrounds } = await getBackgrounds();

    const backgroundOptions = backgrounds.map(background => ({
      text: background.name,
      value: background.id,
      mass_normalized: background.mass_normalized,
    }));

    this.setState({
      backgroundOptions: backgroundOptions,
    });
  }

  async fetchBackgroundAvailability() {
    const { selectedIds } = this.props;
    const {
      massNormalizedBackgroundsAvailable,
    } = await getMassNormalizedBackgroundAvailability(Array.from(selectedIds));

    this.setState({
      enableMassNormalizedBackgrounds: massNormalizedBackgroundsAvailable,
    });
  }

  onCategoryChange = (categories, subcategories) => {
    this.setState({
      selectedCategories: categories,
      selectedSubcategories: subcategories,
    });
  };

  renderCategoryFilter() {
    const { selectedCategories, selectedSubcategories } = this.state;

    let options = CATEGORIES.map(category => {
      let option = { text: category.name, value: category.name };
      let subcategories = category.children;
      if (Array.isArray(subcategories)) {
        option.suboptions = subcategories.map(subcategory => {
          return { text: subcategory, value: subcategory };
        });
      }
      return option;
    });

    return (
      <MultipleNestedDropdown
        fluid
        options={options}
        onChange={this.onCategoryChange}
        placeholder="Select category"
        selectedOptions={selectedCategories}
        selectedSuboptions={selectedSubcategories}
        useDropdownLabelCounter={false}
      />
    );
  }

  onBackgroundChange = background => {
    this.setState({
      selectedBackground: background,
    });
  };

  renderBackgroundSelect() {
    const {
      backgroundOptions,
      enableMassNormalizedBackgrounds,
      selectedBackground,
    } = this.state;

    return (
      <BackgroundModelFilter
        allBackgrounds={backgroundOptions}
        enableMassNormalizedBackgrounds={enableMassNormalizedBackgrounds}
        fluid
        label={null}
        onChange={this.onBackgroundChange}
        rounded={false}
        value={selectedBackground}
      />
    );
  }

  onTaxonLevelChange = taxonLevel => {
    this.setState({ selectedTaxonLevel: taxonLevel });
  };

  renderTaxonLevelSelect() {
    const taxonLevels = [];
    Object.entries(SPECIES_SELECTION_OPTIONS).forEach(([text, value]) =>
      taxonLevels.push({ text: startCase(text), value }),
    );

    return (
      <Dropdown
        fluid
        options={taxonLevels}
        onChange={this.onTaxonLevelChange}
        placeholder="Select level"
        usePortal
        withinModal
      />
    );
  }

  onSpecificityChange = specificity => {
    this.setState({ selectedSpecificity: specificity });
  };

  renderSpecificityFilter() {
    return (
      <Dropdown
        fluid
        options={SPECIFICITY_OPTIONS}
        placeholder="Select specificity"
        onChange={this.onSpecificityChange}
        usePortal
        withinModal
      />
    );
  }

  onThresholdFilterApply = newThresholdFilters => {
    const { selectedThresholdFilters } = this.state;
    if (isEqual(selectedThresholdFilters, newThresholdFilters)) {
      return;
    }
    this.setState({ selectedThresholdFilters: newThresholdFilters });
  };

  renderThresholdFilterSelect() {
    const { selectedThresholdFilters } = this.state;

    // We don't use the aggregate score filter on heatmaps.
    const thresholdOptions = THRESHOLDS.filter(
      threshold => threshold.value !== "agg_score",
    );

    return (
      <ThresholdFilterDropdown
        label={null}
        onApply={this.onThresholdFilterApply}
        options={{
          targets: thresholdOptions,
          operators: [">=", "<="],
        }}
        placeholder="Add a threshold"
        rounded={false}
        thresholds={selectedThresholdFilters}
        // Note: Portal currently doesn't work properly for ThresholdFilterDropdown.
        useDropdownLabelCounter={false}
      />
    );
  }

  renderModalHeader() {
    const { selectedIds } = this.props;

    return (
      <div className={cs.header}>
        <div className={cs.title}>Create a Taxon Heatmap</div>
        <div className={cs.subtitle}>{size(selectedIds)} samples selected</div>
      </div>
    );
  }

  renderPresets() {
    return (
      <div className={cs.presets}>
        <div className={cs.title}>Optional Presets</div>
        <div className={cs.description}>
          Expedite heatmap creation with presets. Presets cannot be changed. If
          you prefer not to use presets, simply click Continue.
        </div>
        <div className={cs.filter}>
          <div className={cs.label}>
            Categories{" "}
            <span className={cs.optionalLabel}> &mdash; Recommended </span>
          </div>
          {this.renderCategoryFilter()}
        </div>
        <div className={cs.filter}>
          <div className={cs.label}>
            Background{" "}
            <span className={cs.optionalLabel}> &mdash; Recommended </span>
          </div>
          {this.renderBackgroundSelect()}
        </div>
        <div className={cs.filter}>
          <div className={cs.label}>Taxon Level</div>
          {this.renderTaxonLevelSelect()}
        </div>
        <div className={cs.filter}>
          <div className={cs.label}>Read Specificity</div>
          {this.renderSpecificityFilter()}
        </div>
        <div className={cs.filter}>
          <div className={cs.label}>Threshold Filters</div>
          {this.renderThresholdFilterSelect()}
        </div>
      </div>
    );
  }

  getHeatmapUrl() {
    const { selectedIds } = this.props;
    const {
      selectedBackground,
      selectedCategories,
      selectedSpecificity,
      selectedSubcategories,
      selectedTaxonLevel,
      selectedThresholdFilters,
    } = this.state;

    let presets = [];
    if (selectedBackground !== 26) {
      presets.push("background");
    }
    if (selectedCategories.length > 0) {
      presets.push("categories");
    }
    if (!isNull(selectedSpecificity)) {
      presets.push("readSpecificity");
    }
    if (Object.keys(selectedSubcategories).length > 0) {
      presets.push("subcategories");
    }
    if (!isNull(selectedTaxonLevel)) {
      presets.push("species");
    }
    if (selectedThresholdFilters.length > 0) {
      presets.push("thresholdFilters");
    }

    const params = getURLParamString({
      background: selectedBackground,
      categories: selectedCategories,
      subcategories: JSON.stringify(selectedSubcategories),
      readSpecificity: selectedSpecificity,
      sampleIds: Array.from(selectedIds),
      species: selectedTaxonLevel,
      thresholdFilters: JSON.stringify(selectedThresholdFilters),
      presets: presets,
    });

    return `/visualizations/heatmap?${params}`;
  }

  render() {
    const { continueInNewTab, open, onClose } = this.props;
    const {
      selectedBackground,
      selectedCategories,
      selectedSpecificity,
      selectedSubcategories,
      selectedTaxonLevel,
      selectedThresholdFilters,
    } = this.state;
    const url = this.getHeatmapUrl();

    return (
      <Modal narrow open={open} tall onClose={onClose}>
        {this.renderModalHeader()}
        {this.renderPresets()}
        <div className={cs.footer}>
          <PrimaryButton
            className={cs.button}
            text="Continue"
            onClick={() => {
              withAnalytics(
                continueInNewTab ? openUrlInNewTab(url) : openUrl(url),
                ANALYTICS_EVENT_NAMES.HEATMAP_CREATION_MODAL_CONTINUE_BUTTON_CLICKED,
                {
                  selectedBackground,
                  selectedCategories,
                  selectedSpecificity,
                  selectedSubcategories,
                  selectedTaxonLevel,
                  selectedThresholdFilters,
                },
              );
            }}
          />
          <SecondaryButton
            className={cs.button}
            text="Cancel"
            onClick={onClose}
          />
        </div>
      </Modal>
    );
  }
}

HeatmapCreationModal.defaultProps = {
  continueInNewTab: false,
};

HeatmapCreationModal.propTypes = {
  continueInNewTab: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  selectedIds: PropTypes.oneOfType([
    PropTypes.instanceOf(Set),
    PropTypes.array,
  ]),
};

HeatmapCreationModal.contextType = UserContext;
