import React, { useState } from "react";
import ImpactVRSection from "./ImpactVRSection";
import cs from "./ImpactVideoSection.scss";

const ImpactVideoSection = () => {
  const [video, setVideo] = useState("video");

  return (
    <div className={cs.videoSection}>
      <div className={cs.videoSectionInner}>
        <h2>Take the Video Tour</h2>
        <div className={cs.videoSelectionContainer}>
          <button
            onClick={() => {
              setVideo("video");
            }}
            className={`${video === "video" ? cs.active : null}`}
          >
            Video
          </button>
          <button
            onClick={() => {
              setVideo("360");
            }}
            className={`${video === "360" ? cs.active : null}`}
          >
            360&deg;
          </button>
          <button
            onClick={() => {
              setVideo("vr");
            }}
            className={`${video === "vr" ? cs.active : null}`}
          >
            VR
          </button>
        </div>

        {/* show regular video */}
        {video === "video" && (
          <div className={`${cs.videoContainer}`}>
            <div className={cs.video}>
              <iframe
                src="https://www.youtube.com/embed/CWizlAFKKL4"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {/* show  360 */}
        {video === "360" && (
          <div className={cs.videoContainer}>
            <div className={cs.video}>
              <iframe
                src="https://www.youtube.com/embed/EYOV37PjcxQ"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {(video === "video" || video === "360") && (
          <div className={cs.videoDescription}>
            <p>
              Take a 360° Video Tour to see how a local researcher quickly
              detects the source of a meningitis outbreak in Dhaka, Bangladesh,
              using Chan Zuckerberg ID (CZ ID), an open-source, no-code,
              metagenomics analysis platform that empowers researchers to
              rapidly identify new and emerging infectious diseases from
              sequencing data.
            </p>
          </div>
        )}

        {video === "vr" && <ImpactVRSection />}
      </div>
    </div>
  );
};

export default ImpactVideoSection;
