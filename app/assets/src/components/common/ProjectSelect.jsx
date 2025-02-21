// Dropdown that fetches list of updatable projects for the current user.
import { find, sortBy } from "lodash/fp";
import React from "react";
import PropTypes from "~/components/utils/propTypes";
import { SubtextDropdown } from "~ui/controls/dropdowns";

class ProjectSelect extends React.Component {
  getOptions = () =>
    (sortBy("name", this.props.projects) || []).map(project => ({
      value: project.id,
      text: project.name,
      subtext: project.public_access ? "Public Project" : "Private Project",
    }));

  onChange = projectId => {
    this.props.onChange(find({ id: projectId }, this.props.projects));
  };

  render() {
    const { disabled, erred, showSelectedItemSubtext } = this.props;
    return (
      <SubtextDropdown
        fluid
        options={this.getOptions()}
        onChange={val => this.onChange(val)}
        initialSelectedValue={this.props.value}
        placeholder="Select project"
        search
        disabled={disabled}
        erred={erred}
        showSelectedItemSubtext={showSelectedItemSubtext}
      />
    );
  }
}

ProjectSelect.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.Project),
  value: PropTypes.number, // the project id
  onChange: PropTypes.func.isRequired, // the entire project object is returned
  disabled: PropTypes.bool,
  erred: PropTypes.bool,
  showSelectedItemSubtext: PropTypes.bool, // Subtext in selected state
};

ProjectSelect.defaultProps = {
  showSelectedItemSubtext: true,
};

export default ProjectSelect;
