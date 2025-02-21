import { minBy, map } from "lodash/fp";
import moment from "moment";
import PropTypes from "prop-types";
import React from "react";
import ListNotification from "~ui/notifications/ListNotification";
import cs from "./public_sample_notification.scss";

class PublicSampleNotification extends React.Component {
  render() {
    const { samples, projectName, onClose } = this.props;

    let minTimestamp = minBy(sample => moment(sample.private_until), samples);

    const label = (
      <React.Fragment>
        <span className={cs.highlight}>
          {samples.length} sample{samples.length > 1 ? "s" : ""}
        </span>
        &nbsp;of project <span className={cs.highlight}>{projectName}</span>{" "}
        will become public soon starting on &nbsp;
        <span className={cs.highlight}>
          {moment(minTimestamp.private_until).format("MMM Do, YYYY")}
        </span>
        . If you have any questions, please refer to CZ ID&apos;s&nbsp;
        <a
          className={cs.policyLink}
          href="https://czid.org/privacy"
          target="_blank"
          rel="noreferrer"
        >
          privacy notice
        </a>
        &nbsp;or{" "}
        <a className={cs.emailLink} href="mailto:help@czid.org">
          email us
        </a>
      </React.Fragment>
    );

    return (
      <ListNotification
        className={cs.publicSampleNotification}
        onClose={onClose}
        type="warning"
        label={label}
        listItemName="sample"
        listItems={map("name", samples)}
      />
    );
  }
}

PublicSampleNotification.propTypes = {
  projectName: PropTypes.string.isRequired,
  samples: PropTypes.array.isRequired,
  onClose: PropTypes.func,
};

export default PublicSampleNotification;
