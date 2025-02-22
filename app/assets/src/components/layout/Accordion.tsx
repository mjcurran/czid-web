import cx from "classnames";
import React from "react";

import { IconArrowDownSmall, IconArrowUpSmall } from "~ui/icons";

import cs from "./accordion.scss";

interface AccordionProps {
  className?: string;
  headerClassName?: string;
  iconClassName?: string;
  toggleable?: boolean;
  // the vertical alignment of the toggle arrow with other header elements
  toggleArrowAlignment?: "center" | "baseline" | "topRight";
  // Accordion can be controlled or non-controlled.
  onToggle?: $TSFixMeFunction;
  open?: boolean;
  // Useful for separating the accordion content from the elements below it.
  bottomContentPadding?: boolean;
  header?: React.ReactNode;
  children?: React.ReactNode;
}

class Accordion extends React.Component<AccordionProps> {
  static defaultProps: AccordionProps;
  state = { wasToggled: false, open: false };

  onToggle = () => {
    this.setState({
      open: this.state.wasToggled ? !this.state.open : !this.props.open,
      wasToggled: true,
    });
  };

  render() {
    const {
      header,
      headerClassName,
      children,
      toggleable,
      className,
      iconClassName,
      bottomContentPadding,
      toggleArrowAlignment,
    } = this.props;

    const open = this.state.wasToggled ? this.state.open : this.props.open;

    return (
      <div className={cx(cs.accordion, className)}>
        <div
          className={cx(
            cs.header,
            toggleable && cs.toggleable,
            cs[toggleArrowAlignment],
            headerClassName && headerClassName,
          )}
          onClick={this.props.onToggle || this.onToggle}
        >
          {header}
          <div className={cs.fill} />
          {toggleable && (
            <div className={cs.toggleContainer}>
              {open ? (
                <IconArrowUpSmall
                  className={cx(
                    cs.toggleIcon,
                    iconClassName,
                    cs[toggleArrowAlignment],
                  )}
                />
              ) : (
                <IconArrowDownSmall
                  className={cx(
                    cs.toggleIcon,
                    iconClassName,
                    cs[toggleArrowAlignment],
                  )}
                />
              )}
            </div>
          )}
        </div>
        {(open || !toggleable) && (
          <div
            className={cx(cs.content, bottomContentPadding && cs.bottomPadding)}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
}

Accordion.defaultProps = {
  toggleable: true,
  toggleArrowAlignment: "center",
  open: false,
};

export default Accordion;
