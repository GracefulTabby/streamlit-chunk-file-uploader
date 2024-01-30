import React, { ReactNode } from "react";
import ProgressBar from 'react-bootstrap/ProgressBar';
import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib";
import { MdOutlineCloudUpload } from 'react-icons/md'
import { RxCross2 } from "react-icons/rx";
import { FaRegFile } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Type definition for the input associative array
type SendData = {
  fileId: string | null;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
};

interface State {
  file: File | null;
  fileId: string | null;
  loadedChunks: number;
  uploading: boolean;
  buttonHover: boolean;
  deleteButtonHover: boolean;
}

function getCookie(name: string): string {
  const cookieString = document.cookie;
  if (cookieString) {
    const cookies = cookieString.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + '=')) {
        return cookie.substring(name.length + 1);
      }
    }
  }
  return '';
}

function hexToRgb(hex: string): { r: number, g: number, b: number } {
  // Remove #
  hex = hex.replace(/^#/, '');

  // Convert hex to RGB
  var bigint = parseInt(hex, 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;

  // Return RGB values
  return { r: r, g: g, b: b };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${formattedSize}${sizes[i]}`;
}


class FileUploader extends StreamlitComponentBase<State> {
  public state: State = {
    file: null,
    fileId: null,
    loadedChunks: 0,
    uploading: false,
    buttonHover: false,
    deleteButtonHover: false,
  };

  private readonly DEFAULT_CHUNK_SIZE_MB = 32;

  public render = (): ReactNode => {
    const { theme } = this.props;
    const disabled = this.props.args["disabled"] || false;
    const label = this.props.args["label"]
    const uploadMessage = (this.props.args["uploader_msg"] || "Browse Files to upload.")
    // Set label visibility
    const labelVisibility = this.props.args["label_visibility"];
    const label_style: React.CSSProperties = {
      visibility: labelVisibility === "visible" ? "visible" : "hidden",
      fontSize: "14px",
      display: "flex",
      marginBottom: "0.25rem",
      height: "auto",
      minHeight: "1.5rem",
      verticalAlign: "middle",
      flexDirection: "row",
      WebkitBoxAlign: "center",
      alignItems: "center",
      color: theme?.textColor,
    };
    // Form style
    const form_style: React.CSSProperties = {
      display: "flex",
      WebkitBoxAlign: "center",
      alignItems: "center",
      padding: "1rem",
      borderRadius: "0.5rem",
      cursor: "pointer",
      color: theme?.textColor,
      backgroundColor: theme?.secondaryBackgroundColor,
    };
    // Button style
    const browse_btn_style: React.CSSProperties = {
      display: "inline-flex",
      WebkitBoxAlign: "center",
      alignItems: "center",
      WebkitBoxPack: "center",
      justifyContent: "center",
      fontWeight: 400,
      padding: "0.25rem 0.75rem",
      borderRadius: "0.5rem",
      minHeight: "38.4px",
      margin: "0px",
      lineHeight: "1.6",
      color: "inherit",
      width: "auto",
      userSelect: "none",
      backgroundColor: theme?.backgroundColor,
      cursor: "pointer",
      fontSize: "0.875rem",
    };
    if (disabled) {
      browse_btn_style.opacity = 0.4;
      browse_btn_style.cursor = "not-allowed";
    }
    if (this.state.buttonHover) {
      // Apply hover style
      browse_btn_style.border = `1px solid ${theme?.primaryColor}`;
      browse_btn_style.color = theme?.primaryColor;
    } else {
      // Convert hex to rgb and set opacity to 0.6
      const hex = theme?.textColor as string;
      const { r, g, b } = hexToRgb(hex);
      browse_btn_style.border = `1px solid rgba(${r}, ${g}, ${b}, 0.2)`;
      browse_btn_style.color = theme?.textColor;
    }
    const delete_btn_style: React.CSSProperties = {
      display: "inline-flex",
      WebkitBoxAlign: "center",
      alignItems: "center",
      WebkitBoxPack: "center",
      justifyContent: "center",
      fontWeight: 400,
      borderRadius: "0.5rem",
      minHeight: "38.4px",
      margin: "0px",
      lineHeight: "1.6",
      width: "auto",
      userSelect: "none",
      backgroundColor: "transparent",
      border: "none",
      boxShadow: "none",
      padding: "0px",
      cursor: "pointer",
    };
    if (this.state.deleteButtonHover) {
      // Apply hover style
      delete_btn_style.color = theme?.primaryColor;
    } else {
      delete_btn_style.color = theme?.textColor;
    };

    const fileInputRef = React.createRef<HTMLInputElement>();
    return (
      <main style={{ fontFamily: theme?.font }}>
        {labelVisibility !== "collapsed" && (
          <p style={label_style}>{label}</p>
        )}
        <form style={form_style}
          onClick={() => {
            fileInputRef.current?.click();
          }}
          onDragOver={(e) => this.onDragOver(e)}
          onDrop={(e) => this.onDrop(e)}
        >
          <input
            type="file"
            accept={this.props.args["accept"] || "*.*"}
            className='input-field'
            ref={fileInputRef}
            hidden
            onClick={(e) => {
              e.currentTarget.value = "";
            }}
            onChange={this.onFileChange}
            disabled={disabled || this.state.uploading}
          />
          <div style={{
            display: "flex",
            alignItems: "center",
            WebkitBoxAlign: "center",
            marginRight: "auto",
          }}>
            <span style={{ marginRight: "1rem", color: theme?.textColor, opacity: 0.6, }}>
              <MdOutlineCloudUpload size={36} />
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{
                fontSize: "0.875rem",
                marginBottom: "0.25rem",
                opacity: disabled ? 0.6 : 1,
              }}>{uploadMessage}</span>
              <small style={{
                color: theme?.textColor,
                opacity: 0.6,
              }}>File size limit: unlimited</small>
            </div>
          </div>
          <button type="button" style={browse_btn_style}
            disabled={disabled || this.state.uploading}
            onMouseEnter={() => this.setState({ buttonHover: true })}
            onMouseLeave={() => this.setState({ buttonHover: false })}
          >
            Browse files
          </button>
        </form>
        {this.state.file && (
          <div style={{
            left: 0,
            right: 0,
            lineHeight: 1.25,
            paddingTop: "0.75rem",
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}>
            <div style={{
              display: "flex",
              WebkitBoxAlign: "center",
              alignItems: "center",
              marginBottom: "0.25rem",
            }}>

              <div style={{
                display: "flex",
                padding: "0.25rem",
                color: theme?.textColor,
                opacity: 0.6,
              }}>
                <FaRegFile size='1.5rem' />
              </div>

              <div style={{
                display: "flex",
                WebkitBoxAlign: "center",
                alignItems: "center",
                flex: "1 1 0%",
                paddingLeft: "1rem",
                overflow: "hidden",
              }}>
                <div style={{
                  marginRight: "0.5rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {this.state.file.name}
                </div>
                <small style={{ opacity: 0.6, lineHeight: 1.25 }}>
                  {formatBytes(this.state.file.size)}
                </small>
                {this.state.uploading && (
                  <div style={{
                    padding: "0 1rem",
                    margin: "0 auto",
                    width: "60%",
                  }}>
                    <ProgressBar
                      now={this.state.loadedChunks / this.getTotalChunks() * 100}
                      visuallyHidden style={{ width: "100%" }} />
                  </div>
                )}
              </div>

              <div>
                <button type="button"
                  style={delete_btn_style}
                  disabled={this.state.uploading}
                  onClick={() => {
                    this.onClickUploadedFileDelete();
                    this.setState({ deleteButtonHover: false });
                  }}
                  onMouseEnter={() => this.setState({ deleteButtonHover: true })}
                  onMouseLeave={() => this.setState({ deleteButtonHover: false })}
                ><RxCross2 size='1.25rem' /></button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  };

  // Handle drag over
  private onDragOver = (event: React.DragEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  // Handle drop
  private onDrop = (event: React.DragEvent<HTMLFormElement>): void => {
    event.preventDefault();
    this.handleDrop(event.dataTransfer.files);
  };

  // Process dropped files
  private handleDrop = (files: FileList | null): void => {
    if (files && files.length > 0) {
      const file = files[0];
      this.setState({ file, loadedChunks: 0 }, () => {
        this.uploadFile();
      });
    }
  };

  private getFileName = (): string => {
    const { file } = this.state;
    if (file) {
      return file.name
    }
    return "No selected File";
  };

  private getXsrftoken = (): string => {
    // streamlit_version 1.26.0 - 1.27.0 is "_xsrf"
    // after that "_streamlit_xsrf"
    const xsrf_token = getCookie("_xsrf") || getCookie("_streamlit_xsrf");
    return xsrf_token;
  };

  private deleteUploadedFile = async (): Promise<void> => {
    const endPoint = this.props.args["endpoint"];
    const sessionId = this.props.args["session_id"];
    const fileId = this.state.fileId;
    try {
      if (fileId) {
        await axios.delete(`${endPoint}/${sessionId}/${fileId}`, {
          headers: {
            'X-Xsrftoken': this.getXsrftoken(),
          },
        });
      }
    } finally {
      this.setState({ fileId: null });
    }
  };

  private onClickUploadedFileDelete = async (): Promise<void> => {
    try {
      await this.deleteUploadedFile();
    } finally {
      this.setState({ file: null });
      Streamlit.setComponentValue(null);
    }

  };
  private getChunkSize = (): number => {
    const maxFileSize = (this.props.args["chunk_size"] || this.DEFAULT_CHUNK_SIZE_MB) * 1024 * 1024;
    return maxFileSize;
  };

  private getTotalChunks = (): number => {
    const { file } = this.state;
    if (file) {
      const fileChunkSize = this.getChunkSize();
      return Math.ceil(file.size / fileChunkSize);
    }
    return 0;
  };


  private onFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] || null;
    this.setState({ file, loadedChunks: 0 }, () => {
      this.uploadFile();
    });
  };

  private uploadFile = async (): Promise<void> => {
    if (this.state.file) {
      this.deleteUploadedFile();
      const fileSize = this.state.file.size;
      const fileChunkSize = this.getChunkSize();
      this.setState({ uploading: true });
      if (fileSize <= fileChunkSize) {
        const file = this.state.file as File;
        const fileId = uuidv4();
        const endPoint = this.props.args["endpoint"];
        const sessionId = this.props.args["session_id"];
        const formData = new FormData();
        formData.append('sessionId', sessionId);
        formData.append('file', file);
        try {
          const response = await axios.put(`${endPoint}/${sessionId}/${fileId}`, formData, {
            headers: {
              'X-Xsrftoken': this.getXsrftoken(),
            },
          });
          if (response.status === 204) {
            this.setState({ fileId });
            const sendData: SendData = {
              fileId: fileId,
              fileSize: file.size,
              fileName: file.name,
              fileType: file.type,
              totalChunks: 1,
            };
            Streamlit.setComponentValue(sendData);
          } else {
            // Handle error if needed
          }
        } catch (error) {
          console.error('Fetch error:', error);
        } finally {
          this.setState({ uploading: false });
        }
      } else {
        await this.uploadFileChunks();
      }
    }
  };

  private uploadFileChunks = async (): Promise<void> => {
    const file = this.state.file as File;
    const fileChunkSize = this.getChunkSize();
    const totalChunks = this.getTotalChunks();
    const endPoint = this.props.args["endpoint"];
    const sessionId = this.props.args["session_id"];
    const fileId = uuidv4();

    // Create an array to store Promises for fetching data of all chunks.
    const axiosInstances: Promise<void>[] = [];

    // Process each chunk one by one and fetch the data.
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * fileChunkSize;
      const end = Math.min(start + fileChunkSize, file.size);
      const chunk = file.slice(start, end);
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('file', chunk);

      // Create an Axios instance and send the request.
      const axiosInstance = axios.create({
        headers: {
          'X-Xsrftoken': this.getXsrftoken(),
        },
      });

      // Send the request and add the Promise for handling the result to the array.
      axiosInstances.push(
        await axiosInstance.put(`${endPoint}/${sessionId}/${fileId}.${chunkIndex}`, formData)
          .then(response => {
            this.setState(prevState => ({
              loadedChunks: prevState.loadedChunks + 1
            }));
            return response.data;
          })
          .catch(error => {
            throw error;
          })
      );
    }

    try {
      // Wait for all requests to complete.
      await Promise.all(axiosInstances);

    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      // Send file information.
      const sendData: SendData = {
        fileId: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks,
      };
      Streamlit.setComponentValue(sendData);
      // Clear the uploading state.
      this.setState({ uploading: false, fileId });
    }
    return Promise.resolve();
  };

}

export default withStreamlitConnection(FileUploader);
