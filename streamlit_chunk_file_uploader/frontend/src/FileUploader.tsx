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
  files?: FileData[];
};

type FileData = {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
};

interface State {
  file: File | null;
  files: File[];
  fileId: string | null;
  fileIds: string[];
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

function getStreamlitUrl(): string {
  // streamlitUrl
  var queryString = window.location.search;
  var urlParams = new URLSearchParams(queryString);
  return urlParams.get("streamlitUrl") || window.parent.document.baseURI;
}


class FileUploader extends StreamlitComponentBase<State> {
  public state: State = {
    file: null,
    files: [],
    fileId: null,
    fileIds: [],
    loadedChunks: 0,
    uploading: false,
    buttonHover: false,
    deleteButtonHover: false,
  };

  private readonly DEFAULT_CHUNK_SIZE_MB = 32;
  private readonly MAX_PARALLEL_UPLOADS = 4;

  public render = (): ReactNode => {
    const { theme } = this.props;
    const disabled = this.props.args["disabled"] || false;
    const label = this.props.args["label"]
    const uploadMessage = (this.props.args["uploader_msg"] || "Browse Files to upload.")
    const acceptMultipleFiles = this.props.args["accept_multiple_files"] || false;
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
            multiple={acceptMultipleFiles}
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
        {acceptMultipleFiles && this.state.files.length > 0 ? (
          <div style={{
            left: 0,
            right: 0,
            lineHeight: 1.25,
            paddingTop: "0.75rem",
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}>
            {this.state.files.map((file, index) => (
              <div key={index} style={{
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
                    {file.name}
                  </div>
                  <small style={{ opacity: 0.6, lineHeight: 1.25 }}>
                    {formatBytes(file.size)}
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
                      this.onClickUploadedFileDelete(index);
                      this.setState({ deleteButtonHover: false });
                    }}
                    onMouseEnter={() => this.setState({ deleteButtonHover: true })}
                    onMouseLeave={() => this.setState({ deleteButtonHover: false })}
                  ><RxCross2 size='1.25rem' /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          this.state.file && (
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
          )
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
    const acceptMultipleFiles = this.props.args["accept_multiple_files"] || false;
    if (files && files.length > 0) {
      if (acceptMultipleFiles) {
        const fileArray = Array.from(files);
        this.setState({ files: fileArray, loadedChunks: 0 }, () => {
          this.uploadFiles();
        });
      } else {
        const file = files[0];
        this.setState({ file, loadedChunks: 0 }, () => {
          this.uploadFile();
        });
      }
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

  private deleteUploadedFile = async (fileId?: string): Promise<void> => {
    const endPoint = this.props.args["endpoint"];
    const sessionId = this.props.args["session_id"];
    const targetFileId = fileId || this.state.fileId;
    const xsrfToken = this.getXsrftoken();
    try {
      if (targetFileId) {
        const config: any = {
          baseURL: getStreamlitUrl(),
        };
        if (xsrfToken) {
          config.headers = {
            'X-Xsrftoken': xsrfToken,
          };
        }
        await axios.delete(`${endPoint}/${sessionId}/${targetFileId}`, config);
      }
    } finally {
      if (!fileId) {
        this.setState({ fileId: null });
      }
    }
  };

  private onClickUploadedFileDelete = async (index?: number): Promise<void> => {
    const acceptMultipleFiles = this.props.args["accept_multiple_files"] || false;
    try {
      if (acceptMultipleFiles && index !== undefined) {
        const fileId = this.state.fileIds[index];
        await this.deleteUploadedFile(fileId);
        const newFiles = [...this.state.files];
        newFiles.splice(index, 1);
        const newFileIds = [...this.state.fileIds];
        newFileIds.splice(index, 1);
        this.setState({ files: newFiles, fileIds: newFileIds });
        
        if (newFiles.length === 0) {
          Streamlit.setComponentValue(null);
        } else {
          const filesData: FileData[] = newFiles.map((file, i) => ({
            fileId: newFileIds[i],
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks: Math.ceil(file.size / this.getChunkSize()),
          }));
          const sendData: SendData = {
            fileId: newFileIds[0],
            fileName: newFiles[0].name,
            fileSize: newFiles[0].size,
            fileType: newFiles[0].type,
            totalChunks: Math.ceil(newFiles[0].size / this.getChunkSize()),
            files: filesData,
          };
          Streamlit.setComponentValue(sendData);
        }
      } else {
        await this.deleteUploadedFile();
        this.setState({ file: null });
        Streamlit.setComponentValue(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };
  private getChunkSize = (): number => {
    const maxFileSize = (this.props.args["chunk_size"] || this.DEFAULT_CHUNK_SIZE_MB) * 1024 * 1024;
    return maxFileSize;
  };

  private getTotalChunks = (): number => {
    const acceptMultipleFiles = this.props.args["accept_multiple_files"] || false;
    if (acceptMultipleFiles) {
      const { files } = this.state;
      if (files.length > 0) {
        const fileChunkSize = this.getChunkSize();
        return files.reduce((total, file) => total + Math.ceil(file.size / fileChunkSize), 0);
      }
      return 0;
    } else {
      const { file } = this.state;
      if (file) {
        const fileChunkSize = this.getChunkSize();
        return Math.ceil(file.size / fileChunkSize);
      }
      return 0;
    }
  };


  private onFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const acceptMultipleFiles = this.props.args["accept_multiple_files"] || false;
    if (acceptMultipleFiles) {
      const fileList = event.target.files;
      if (fileList && fileList.length > 0) {
        const files = Array.from(fileList);
        this.setState({ files, loadedChunks: 0 }, () => {
          this.uploadFiles();
        });
      }
    } else {
      const file = event.target.files?.[0] || null;
      this.setState({ file, loadedChunks: 0 }, () => {
        this.uploadFile();
      });
    }
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
        const xsrfToken = this.getXsrftoken();
        const config: any = {
          baseURL: getStreamlitUrl(),
        };
        if (xsrfToken) {
          config.headers = {
            'X-Xsrftoken': xsrfToken,
          };
        }
        try {
          const response = await axios.put(`${endPoint}/${sessionId}/${fileId}`, formData, config);
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

    // Limit the number of concurrent executions
    const Parallels = (ps = new Set<Promise<unknown>>()) => ({
      add: (p: Promise<unknown>) => ps.add(!!p.then(() => ps.delete(p)).catch(() => ps.delete(p)) && p),
      wait: (limit: number) => ps.size >= limit && Promise.race(ps),
      all: () => Promise.all(ps),
    });
    const ps = Parallels();

    // Process each chunk one by one and fetch the data.
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * fileChunkSize;
      const end = Math.min(start + fileChunkSize, file.size);
      const chunk = file.slice(start, end);
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('file', chunk);
      const xsrfToken = this.getXsrftoken();
      const config: any = {
        baseURL: getStreamlitUrl(),
      };
      if (xsrfToken) {
        config.headers = {
          'X-Xsrftoken': xsrfToken,
        };
      }
      // Create an Axios instance and send the request.
      const axiosInstance = axios.create(config);
      // Send the request and add the Promise for handling the result to the array.
      ps.add(
        axiosInstance.put(`${endPoint}/${sessionId}/${fileId}.${chunkIndex}`, formData)
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
      // Limit the number of concurrent requests to avoid overloading the server.
      await ps.wait(this.MAX_PARALLEL_UPLOADS);
    }

    try {
      // Wait for all requests to complete.
      await ps.all();

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

  private uploadFiles = async (): Promise<void> => {
    if (this.state.files.length === 0) {
      return;
    }

    this.setState({ uploading: true });
    const endPoint = this.props.args["endpoint"];
    const sessionId = this.props.args["session_id"];
    const fileChunkSize = this.getChunkSize();
    const filesData: FileData[] = [];
    const fileIds: string[] = [];

    // Delete previously uploaded files
    for (const oldFileId of this.state.fileIds) {
      await this.deleteUploadedFile(oldFileId);
    }

    try {
      // Upload each file sequentially
      for (const file of this.state.files) {
        const fileId = uuidv4();
        fileIds.push(fileId);

        if (file.size <= fileChunkSize) {
          // Upload small file in one request
          const formData = new FormData();
          formData.append('sessionId', sessionId);
          formData.append('file', file);
          const xsrfToken = this.getXsrftoken();
          const config: any = {
            baseURL: getStreamlitUrl(),
          };
          if (xsrfToken) {
            config.headers = {
              'X-Xsrftoken': xsrfToken,
            };
          }
          await axios.put(`${endPoint}/${sessionId}/${fileId}`, formData, config);
          filesData.push({
            fileId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks: 1,
          });
        } else {
          // Upload large file in chunks
          const totalChunks = Math.ceil(file.size / fileChunkSize);
          const Parallels = (ps = new Set<Promise<unknown>>()) => ({
            add: (p: Promise<unknown>) => ps.add(!!p.then(() => ps.delete(p)).catch(() => ps.delete(p)) && p),
            wait: (limit: number) => ps.size >= limit && Promise.race(ps),
            all: () => Promise.all(ps),
          });
          const ps = Parallels();

          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * fileChunkSize;
            const end = Math.min(start + fileChunkSize, file.size);
            const chunk = file.slice(start, end);
            const formData = new FormData();
            formData.append('sessionId', sessionId);
            formData.append('file', chunk);
            const xsrfToken = this.getXsrftoken();
            const config: any = {
              baseURL: getStreamlitUrl(),
            };
            if (xsrfToken) {
              config.headers = {
                'X-Xsrftoken': xsrfToken,
              };
            }
            const axiosInstance = axios.create(config);
            ps.add(
              axiosInstance.put(`${endPoint}/${sessionId}/${fileId}.${chunkIndex}`, formData)
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
            await ps.wait(this.MAX_PARALLEL_UPLOADS);
          }
          await ps.all();
          
          filesData.push({
            fileId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks,
          });
        }
      }

      // Send all file information to Streamlit
      const sendData: SendData = {
        fileId: fileIds[0],
        fileName: this.state.files[0].name,
        fileSize: this.state.files[0].size,
        fileType: this.state.files[0].type,
        totalChunks: filesData[0].totalChunks,
        files: filesData,
      };
      Streamlit.setComponentValue(sendData);
      this.setState({ fileIds });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      this.setState({ uploading: false });
    }
  };

}

export default withStreamlitConnection(FileUploader);
