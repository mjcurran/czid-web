// This legacy component is intended to be developer-facing only.
// The user-facing component has since evolved to ResultsFolder.jsx.
import PropTypes from "prop-types";
import React from "react";

class RawResultsFolder extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.fileUrl = props.filePath;
    this.filePath = this.fileUrl.split("/");
    this.fileList = props.fileList;
    this.sampleName = props.sampleName;
    this.projectName = props.projectName;
  }

  download(url) {
    location.href = `${url}`;
  }

  render() {
    return (
      <div className="results-folder">
        <div className="header">
          <span className="title">
            <a href="/">{this.filePath[0]}</a>
            <span className="path">{">"}</span>

            <a href={`/home?project_id=${this.filePath[1]}`}>
              {this.projectName}
            </a>
            <span className="path">/</span>

            <a href={this.props.samplePath}>{this.sampleName}</a>
            <span className="path">/</span>

            {this.filePath[3]}
          </span>
        </div>
        <div className="header">
          {this.fileList.length ? (
            <table>
              <thead>
                <tr>
                  <th>
                    {this.filePath[3] === "results"
                      ? "Results folder"
                      : "Fastqs folder"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {this.fileList.map((file, i) => {
                  return (
                    <tr
                      className="file-link"
                      onClick={this.download.bind(this, file.url)}
                      key={i}
                    >
                      <td>
                        <i className="fa fa-file" />
                        {file["display_name"]}
                        <span className="size-tag"> -- {file["size"]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            "No files to show"
          )}
        </div>
      </div>
    );
  }
}

RawResultsFolder.propTypes = {
  samplePath: PropTypes.string,
  sampleName: PropTypes.string,
  projectName: PropTypes.string,
  filePath: PropTypes.string,
  fileList: PropTypes.array,
};

export default RawResultsFolder;
