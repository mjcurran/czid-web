import PropTypes from "prop-types";
import React from "react";

import ImgMicrobeSecondary from "~/components/ui/illustrations/ImgMicrobeSecondary";
import LandingHeader from "~/components/views/LandingHeader";
import InfoBanner from "~/components/views/discovery/InfoBanner";

import cs from "./page_not_found.scss";

const PageNotFound = ({ browserInfo, showLandingHeader }) => {
  return (
    <div>
      {showLandingHeader && <LandingHeader browserInfo={browserInfo} />}
      <div className={cs.bannerContainer}>
        <InfoBanner
          icon={<ImgMicrobeSecondary />}
          link={{
            href: "/",
            text: "Go to CZ ID home",
          }}
          message="This link might be broken or permissions might have been changed."
          title="Oh no! This page isn't available."
          type="page_not_found"
        />
      </div>
    </div>
  );
};

PageNotFound.propTypes = {
  browserInfo: PropTypes.object,
  showLandingHeader: PropTypes.bool,
};

export default PageNotFound;
