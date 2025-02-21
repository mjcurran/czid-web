import { groupBy, get } from "lodash/fp";
import React from "react";

import PropTypes from "~/components/utils/propTypes";
import {
  doesResultMatch,
  sortResults,
} from "~/components/views/SampleUploadFlow/utils";

import LiveSearchPopBox from "~ui/controls/LiveSearchPopBox";

const SUGGESTED = "SUGGESTED";
const ALL = "ALL";

class SampleTypeSearchBox extends React.Component {
  handleSearchTriggered = query => {
    return this.buildResults(this.getMatchesByCategory(query), query);
  };

  getMatchesByCategory(query) {
    const matchedSampleTypes = this.props.sampleTypes.filter(sampleType =>
      doesResultMatch(sampleType, query),
    );

    const sortedSampleTypes = sortResults(
      matchedSampleTypes,
      query,
      sampleType => sampleType.name,
    );

    // Sample types are grouped differently based on whether the current
    // sample's host genome is an insect, a human, a non-human animal or
    // unknown. The "suggested" group is shown first, then the "all" group.
    const getSampleTypeCategory = sampleType => {
      const { taxaCategory } = this.props;
      const isHuman = taxaCategory === "human";
      const isInsect = taxaCategory === "insect";
      const isNonHumanAnimal = taxaCategory === "non-human-animal";

      if (sampleType.insect_only) {
        return isInsect ? SUGGESTED : ALL;
      }
      if (sampleType.human_only) {
        return isHuman ? SUGGESTED : ALL;
      }
      if (isNonHumanAnimal) {
        return SUGGESTED;
      }
      return ALL;
    };
    return groupBy(getSampleTypeCategory, sortedSampleTypes);
  }

  buildResults(sampleTypesByCategory, query) {
    const formatResult = result => {
      return {
        title: result.name,
        name: result.name,
        description: this.props.showDescription ? result.group : null,
      };
    };
    const results = {};
    if (sampleTypesByCategory[SUGGESTED]) {
      results.suggested = {
        name: SUGGESTED,
        results: sampleTypesByCategory[SUGGESTED].map(formatResult),
      };
    }
    if (sampleTypesByCategory[ALL]) {
      results.all = {
        name: ALL,
        results: sampleTypesByCategory[ALL].map(formatResult),
      };
    }
    if (
      query.length &&
      get([0, "name"], sampleTypesByCategory[SUGGESTED]) !== query
    ) {
      results.noMatch = {
        name: "Use Plain Text (No Match)",
        results: [{ title: query, name: query }],
      };
    }
    return results;
  }

  render() {
    const { className, value, onResultSelect } = this.props;
    return (
      <LiveSearchPopBox
        className={className}
        value={value}
        onSearchTriggered={this.handleSearchTriggered}
        onResultSelect={onResultSelect}
        minChars={0}
        placeholder=""
        icon="chevron down"
        shouldSearchOnFocus={true}
        delayTriggerSearch={0}
      />
    );
  }
}

SampleTypeSearchBox.propTypes = {
  className: PropTypes.string,
  onResultSelect: PropTypes.func.isRequired,
  value: PropTypes.string,
  sampleTypes: PropTypes.arrayOf(PropTypes.SampleTypeProps).isRequired,
  taxaCategory: PropTypes.string,
  showDescription: PropTypes.bool,
};

export default SampleTypeSearchBox;
