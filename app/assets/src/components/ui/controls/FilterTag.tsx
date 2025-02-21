import cx from "classnames";
import React from "react";

import Label from "~/components/ui/labels/Label";
import IconCloseSmall from "../icons/IconCloseSmall";

import cs from "./filter_tag.scss";

interface FilterTagProps {
  text?: string;
  onClose?: $TSFixMeFunction;
  className?: string;
}

const FilterTag = ({ text, onClose, className }: FilterTagProps) => {
  const labelText = (
    <>
      {text}
      {onClose && <IconCloseSmall className={cs.closeIcon} onClick={onClose} />}
    </>
  );

  return (
    <div className={cs.labelContainer}>
      <Label
        className={cx(cs.filterTag, className)}
        size="tiny"
        text={labelText}
      />
    </div>
  );
};

export default FilterTag;
