import { debounce } from "lodash/fp";
import PropTypes from "prop-types";
import React from "react";

import { getTaxaWithReadsSuggestions } from "~/api";
import { ContextPlaceholder } from "~ui/containers";
import { SearchBoxList } from "~ui/controls";

import cs from "./Heatmap/metadata_selector.scss";

const AUTOCOMPLETE_DEBOUNCE_DELAY = 200;

export default class TaxonSelector extends React.Component {
  state = {
    options: this.props.availableTaxa,
  };

  _lastQuery = "";

  handleFilterChange = query => {
    this.loadOptionsForQuery(query);
  };

  // Debounce this function, so it only runs after the user has not typed for a delay.
  loadOptionsForQuery = debounce(AUTOCOMPLETE_DEBOUNCE_DELAY, async query => {
    this._lastQuery = query;
    const { sampleIds, availableTaxa, taxLevel } = this.props;

    const searchResults = await getTaxaWithReadsSuggestions(
      query,
      Array.from(sampleIds),
      taxLevel,
    );

    // If the query has since changed, discard the response.
    if (query !== this._lastQuery) {
      return;
    }

    const options = searchResults.map(result => ({
      value: result.taxid,
      label: result.title,
      count: result.sample_count,
    }));

    if (query.length > 0) {
      this.setState({ options });
    } else {
      // If there is currently no search query, then default to the selected and available taxa.
      this.setState({ options: availableTaxa });
    }
  });

  render() {
    const {
      addTaxonTrigger,
      onTaxonSelectionChange,
      onTaxonSelectionClose,
      selectedTaxa,
    } = this.props;
    const { options } = this.state;

    return (
      <ContextPlaceholder
        closeOnOutsideClick
        context={addTaxonTrigger}
        horizontalOffset={5}
        verticalOffset={10}
        onClose={onTaxonSelectionClose}
        position="top left"
      >
        <div className={cs.metadataContainer}>
          <SearchBoxList
            options={options}
            onChange={onTaxonSelectionChange}
            selected={selectedTaxa}
            onFilterChange={this.handleFilterChange}
            title="Select Taxon"
            labelTitle="Taxa"
            countTitle="Samples"
          />
        </div>
      </ContextPlaceholder>
    );
  }
}

TaxonSelector.propTypes = {
  addTaxonTrigger: PropTypes.object,
  availableTaxa: PropTypes.array,
  sampleIds: PropTypes.array,
  selectedTaxa: PropTypes.object,
  onTaxonSelectionChange: PropTypes.func,
  onTaxonSelectionClose: PropTypes.func,
  taxLevel: PropTypes.string,
};
