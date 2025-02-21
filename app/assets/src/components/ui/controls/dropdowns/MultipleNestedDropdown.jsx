import { omit } from "lodash/fp";
import PropTypes from "prop-types";
import React from "react";
import ArrayUtils from "../../../utils/ArrayUtils";
import BareDropdown from "./BareDropdown";
import CheckboxItem from "./common/CheckboxItem";
import DropdownLabel from "./common/DropdownLabel";
import DropdownTrigger from "./common/DropdownTrigger";
import cs from "./multiple_nested_dropdown.scss";

class MultipleNestedDropdown extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedOptions: this.props.selectedOptions || [],
      selectedSuboptions: this.props.selectedSuboptions || {},
      oldSelectedOptions: [],
      oldSelectedSuboptions: {},
    };

    this.suboptionsToOptionMap = {};
    this.props.options.forEach(option => {
      (option.suboptions || []).forEach(suboption => {
        this.suboptionsToOptionMap[suboption.value] = option.value;
      });
    });

    this.handleOptionClicked = this.handleOptionClicked.bind(this);
    this.handleSuboptionClicked = this.handleSuboptionClicked.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    let newState = null;
    if (
      props.selectedOptions !== state.oldSelectedOptions ||
      !ArrayUtils.equal(props.selectedOptions, state.oldSelectedOptions)
    ) {
      newState = Object.assign(
        {},
        {
          selectedOptions: props.selectedOptions,
          oldSelectedOptions: props.selectedOptions,
        },
      );
    }

    if (
      props.selectedSuboptions !== state.oldSelectedSuboptions ||
      !MultipleNestedDropdown.areSuboptionsEqual(
        props.selectedSuboptions,
        state.oldSelectedSuboptions,
      )
    ) {
      newState = Object.assign(newState || {}, {
        selectedSuboptions: props.selectedSuboptions,
        oldSelectedSuboptions: props.selectedSuboptions,
      });
    }

    return newState;
  }

  static areSuboptionsEqual(suboptions1, suboptions2) {
    if (!suboptions1 || !suboptions2) return suboptions1 === suboptions2;
    if (Object.keys(suboptions1) !== Object.keys(suboptions2)) return false;
    for (let key in suboptions1) {
      if (!(key in suboptions2)) return false;
      if (!ArrayUtils.equal(suboptions1[key], suboptions2[key])) return false;
    }
    return true;
  }

  handleOptionClicked(optionValue, isChecked) {
    if (isChecked) {
      // when option is checked, check all suboptions
      this.setState(
        prevState => {
          let stateUpdate = {
            selectedOptions: [...prevState.selectedOptions, optionValue],
          };
          const optionClicked = this.props.options.find(
            option => option.value === optionValue,
          );
          if (optionClicked.suboptions) {
            let selectedSuboptions = optionClicked.suboptions.map(
              suboption => suboption.value,
            );
            prevState.selectedSuboptions[optionValue] = selectedSuboptions;
            stateUpdate.selectedSuboptions = prevState.selectedSuboptions;
          }
          return stateUpdate;
        },
        () => {
          this.props.onChange(
            this.state.selectedOptions,
            this.state.selectedSuboptions,
          );
        },
      );
    } else {
      this.setState(
        prevState => {
          return {
            selectedOptions: prevState.selectedOptions.filter(
              value => value !== optionValue,
            ),
          };
        },
        () =>
          this.props.onChange(
            this.state.selectedOptions,
            this.state.selectedSuboptions,
          ),
      );
    }
  }

  handleSuboptionClicked(suboptionValue, isChecked, event) {
    const optionValue = this.suboptionsToOptionMap[suboptionValue];
    if (isChecked) {
      this.setState(
        prevState => {
          if (!prevState.selectedSuboptions[optionValue]) {
            prevState.selectedSuboptions[optionValue] = [];
          }
          prevState.selectedSuboptions[optionValue].push(suboptionValue);
          return { selectedSuboptions: prevState.selectedSuboptions };
        },
        () =>
          this.props.onChange(
            this.state.selectedOptions,
            this.state.selectedSuboptions,
          ),
      );
    } else {
      this.setState(
        prevState => {
          if (prevState.selectedSuboptions[optionValue]) {
            let suboptions = prevState.selectedSuboptions[optionValue].filter(
              value => value !== suboptionValue,
            );
            prevState.selectedSuboptions[optionValue] = suboptions;
          }
          return { selectedSuboptions: prevState.selectedSuboptions };
        },
        () =>
          this.props.onChange(
            this.state.selectedOptions,
            this.state.selectedSuboptions,
          ),
      );
    }
  }

  handleItemClicked(event) {
    event.stopPropagation();
  }

  getNumberOfSelectedOptions() {
    let suboptionCount = 0;
    this.props.options.forEach(option => {
      suboptionCount += (this.state.selectedSuboptions[option.value] || [])
        .length;
    });
    return this.state.selectedOptions.length + suboptionCount;
  }

  renderItem(value, text, checked, callback) {
    const { boxed } = this.props;
    return (
      <CheckboxItem
        boxed={boxed}
        key={value}
        value={value}
        label={text}
        checked={checked}
        onOptionClick={callback}
      />
    );
  }

  isOptionChecked(optionValue) {
    return this.state.selectedOptions.indexOf(optionValue) > -1;
  }

  isSuboptionChecked(optionValue, suboptionValue) {
    return (
      (this.state.selectedSuboptions[optionValue] || []).indexOf(
        suboptionValue,
      ) > -1
    );
  }

  renderItems() {
    let items = [];
    this.props.options.forEach(option => {
      items.push(
        this.renderItem(
          option.value,
          option.text,
          this.isOptionChecked(option.value),
          this.handleOptionClicked,
        ),
      );
      (option.suboptions || []).forEach(suboption => {
        items.push(
          this.renderItem(
            suboption.value,
            `${option.text} - ${suboption.text}`,
            this.isSuboptionChecked(option.value, suboption.value),
            this.handleSuboptionClicked,
          ),
        );
      });
    });
    return items;
  }

  renderLabel() {
    const {
      disabled,
      disableMarginRight,
      label,
      placeholder,
      rounded,
      useDropdownLabelCounter,
    } = this.props;

    const numberOfSelectedOptions = this.getNumberOfSelectedOptions();

    const labelText =
      numberOfSelectedOptions > 0 && label ? label + ":" : label;

    const labelCounter = numberOfSelectedOptions > 0 && (
      <DropdownLabel
        className={cs.dropdownLabel}
        disabled={disabled}
        text={String(numberOfSelectedOptions)}
      />
    );

    const numSelectedText =
      !useDropdownLabelCounter && numberOfSelectedOptions > 0
        ? `${String(numberOfSelectedOptions)} selected`
        : null;

    return (
      <DropdownTrigger
        className={cs.dropdownTrigger}
        disableMarginRight={disableMarginRight}
        label={labelText}
        rounded={rounded}
        placeholder={placeholder}
        value={useDropdownLabelCounter ? labelCounter : numSelectedText}
      />
    );
  }

  render() {
    const otherProps = omit(
      [
        "boxed",
        "selectedOptions",
        "selectedSuboptions",
        "label",
        "rounded",
        "onChange",
        "options",
        // This component needs to implement the itemSearchStrings prop before search will work.
        // Manually disable the search prop for now.
        "search",
        "disableMarginRight",
        "placeholder",
        "useDropdownLabelCounter",
      ],
      this.props,
    );

    return (
      <BareDropdown
        className={cs.multipleNestedDropdown}
        floating
        arrowInsideTrigger
        {...otherProps}
        trigger={this.renderLabel()}
        items={this.renderItems()}
        closeOnClick={false}
      />
    );
  }
}

MultipleNestedDropdown.defaultProps = {
  disableMarginRight: false,
  selectedOptions: [],
  selectedSuboptions: {},
  useDropdownLabelCounter: true,
};

MultipleNestedDropdown.propTypes = {
  boxed: PropTypes.bool,
  label: PropTypes.string,
  onChange: PropTypes.func,
  options: PropTypes.array,
  selectedOptions: PropTypes.array,
  selectedSuboptions: PropTypes.object,
  disabled: PropTypes.bool,
  rounded: PropTypes.bool,
  disableMarginRight: PropTypes.bool,
  placeholder: PropTypes.string,
  useDropdownLabelCounter: PropTypes.bool,
};

export default MultipleNestedDropdown;
