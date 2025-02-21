import React from "react";

import MultipleNestedDropdown from "../../../ui/controls/dropdowns/MultipleNestedDropdown";
import PropTypes from "../../../utils/propTypes";

const CategoryFilter = ({
  allCategories,
  categoryParentChild,
  categoryChildParent,
  disabled = false,
  disableMarginRight,
  selectedCategories,
  selectedSubcategories,
  onChange,
}) => {
  let options = [];
  allCategories.forEach(category => {
    options.push({ text: category.name, value: category.name });

    let suboptions = [];
    (categoryParentChild[category.name] || []).forEach(subcategory => {
      suboptions.push({
        text: subcategory,
        value: subcategory,
      });
    });
    if (suboptions.length > 0) {
      options[options.length - 1].suboptions = suboptions;
    }
  });

  let selectedSuboptions = {};
  selectedSubcategories.forEach(subcategory => {
    let category = categoryChildParent[subcategory];
    if (!selectedSuboptions[category]) {
      selectedSuboptions[category] = [];
    }
    selectedSuboptions[category].push(subcategory);
  });

  return (
    <MultipleNestedDropdown
      options={options}
      selectedOptions={selectedCategories}
      selectedSuboptions={selectedSuboptions}
      boxed
      rounded
      label="Categories"
      onChange={onChange}
      disableMarginRight={disableMarginRight}
      disabled={disabled}
    />
  );
};

CategoryFilter.propTypes = {
  allCategories: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
    }),
  ).isRequired,
  categoryParentChild: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string))
    .isRequired,
  categoryChildParent: PropTypes.objectOf(PropTypes.string).isRequired,
  disabled: PropTypes.bool,
  disableMarginRight: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  selectedCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedSubcategories: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default CategoryFilter;
