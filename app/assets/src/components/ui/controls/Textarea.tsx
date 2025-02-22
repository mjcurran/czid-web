import cx from "classnames";
import React from "react";
import { TextArea as SemanticTextarea } from "semantic-ui-react";
import cs from "./textarea.scss";

interface TextareaProps {
  value?: string;
  onChange?: $TSFixMeFunction;
  className?: string;
}

class Textarea extends React.Component<TextareaProps> {
  handleChange = (_, inputProps) => {
    if (this.props.onChange) {
      this.props.onChange(inputProps.value);
    }
  };

  render() {
    const { className, ...props } = this.props;
    return (
      <SemanticTextarea
        className={cx(cs.textarea, className)}
        {...props}
        onChange={this.handleChange}
      />
    );
  }
}

export default Textarea;
