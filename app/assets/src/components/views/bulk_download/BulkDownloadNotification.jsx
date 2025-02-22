import PropTypes from "prop-types";
import React from "react";

import { trackEvent } from "~/api/analytics";
import { showToast } from "~/components/utils/toast";
import Notification from "~ui/notifications/Notification";

import cs from "./bulk_download_notification.scss";

export default class BulkDownloadNotification extends React.Component {
  render() {
    const { onClose } = this.props;

    const label = (
      <div className={cs.label}>
        <div className={cs.message}>
          We&apos;ve received your download request and are busy preparing your
          data. To check the status of your download, visit the{" "}
          <a
            href="bulk_downloads"
            onClick={() =>
              trackEvent("BulkDownloadNotification_downloads-page-link-clicked")
            }
          >
            Downloads page
          </a>
          .
        </div>
      </div>
    );

    return (
      <Notification
        className={cs.publicSampleNotification}
        displayStyle="elevated"
        type="info"
        onClose={onClose}
      >
        {label}
      </Notification>
    );
  }
}

export const showBulkDownloadNotification = () => {
  showToast(
    ({ closeToast }) => <BulkDownloadNotification onClose={closeToast} />,
    {
      autoClose: 12000,
    },
  );
};

BulkDownloadNotification.propTypes = {
  onClose: PropTypes.func,
};
