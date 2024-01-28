import React, { ReactNode } from "react";
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

// インプットとなる連想配列の型定義
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

class FileUploader extends StreamlitComponentBase<State> {
  public state: State = {
    file: null,
    fileId: null,
    loadedChunks: 0,
    uploading: false,
  };

  private readonly DEFAULT_CHUNK_SIZE_MB = 32;

  public render = (): ReactNode => {
    const { theme } = this.props;
    const label = this.props.args["label"]
    const uploadMessage = (this.props.args["uploader_msg"] || "Browse Files to upload.")
    // ラベルの表示を設定する
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
    // formのstyle()
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
    // buttonのstyle
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
      border: `1px solid ${theme?.primaryColor}`,
      // "&:hover": {
      //   color: theme?.primaryColor,
      //   borderColor: theme?.primaryColor,
      // },
    };
    const fileInputRef = React.createRef<HTMLInputElement>();
    return (
      <main style={{ font: theme?.font }}>
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
            accept="*.*"
            className='input-field'
            ref={fileInputRef}
            hidden
            onChange={this.onFileChange}
            disabled={this.props.disabled || this.state.uploading}
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
              <span style={{ marginBottom: "0.25rem" }}>{uploadMessage}</span>
              <small style={{
                color: theme?.textColor,
                opacity: 0.6,
              }}>File size limit: {1024}MB</small>
            </div>
          </div>
          <button type="button" style={browse_btn_style}
            disabled={this.props.disabled || this.state.uploading}
          >
            Browse files
          </button>
        </form>
        {this.state.uploading && (
          <p>Uploading {this.state.loadedChunks} out of {this.getTotalChunks()} chunks...</p>
        )}
        {!this.state.uploading && this.state.loadedChunks > 0 && this.state.loadedChunks === this.getTotalChunks() && (
          <p>Upload completed!</p>
        )}
        {this.state.file && (
          <section className='uploaded-row'>
            <FaRegFile size='1.5em' />
            <span className='upload-content'>
              {this.getFileName()}
            </span>
            <RxCross2 size='1em'
              onClick={() => {
                this.onClickUploadedFileDelete()
              }}
            />
          </section>
        )}
      </main>
    );
  };

  // ドラッグオーバー時の処理
  private onDragOver = (event: React.DragEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  // ドロップ時の処理
  private onDrop = (event: React.DragEvent<HTMLFormElement>): void => {
    event.preventDefault();
    this.handleDrop(event.dataTransfer.files);
  };

  // ドロップされたファイルを処理する
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

    // すべてのチャンクのデータをfetchするためのPromiseを格納する配列を作成
    const axiosInstances: Promise<void>[] = [];

    // チャンクを1つずつ処理してデータをfetchする
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * fileChunkSize;
      const end = Math.min(start + fileChunkSize, file.size);
      const chunk = file.slice(start, end);
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('file', chunk);

      // Axiosのインスタンスを作成し、リクエストを送信する
      const axiosInstance = axios.create({
        headers: {
          'X-Xsrftoken': this.getXsrftoken(),
        },
      });

      // リクエストを送信し、結果を処理するPromiseを配列に追加する
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
      // すべてのリクエストが完了するまで待機
      await Promise.all(axiosInstances);

    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      // ファイルの情報を送信
      const sendData: SendData = {
        fileId: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks,
      };
      Streamlit.setComponentValue(sendData);
      // アップロード中の状態を解除
      this.setState({ uploading: false, fileId });
    }
    return Promise.resolve();
  };

}

export default withStreamlitConnection(FileUploader);
