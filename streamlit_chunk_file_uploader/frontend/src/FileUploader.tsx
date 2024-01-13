import React, { ReactNode } from "react";
import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib";
import { MdCloudUpload } from 'react-icons/md'
import { RxCross2 } from "react-icons/rx";
import { FaRegFile } from 'react-icons/fa';
import './file_uploader.css'


enum UploadMode {
  Single = "singlepart",
  Multipart = "multipart",
  Clear = "clear", // このモードでバックエンドからファイルを消去
}

// インプットとなる連想配列の型定義
type SendData = {
  mode: UploadMode;
  fileName: string;
  fileSize: number;
  data: string | null; //byteString
  totalChunks?: number;
  chunkIndex?: number;
  chunkSize?: number;
};

interface State {
  file: File | null;
  loadedChunks: number;
  uploading: boolean;
}

class FileUploader extends StreamlitComponentBase<State> {
  public state: State = {
    file: null,
    loadedChunks: 0,
    uploading: false,
  };

  private readonly DEFAULT_CHUNK_SIZE_MB = 32;

  public render = (): ReactNode => {
    const { theme } = this.props;
    const style: React.CSSProperties = {};
    if (theme) {
      const borderStyling = `1px solid ${this.state.file ? theme.primaryColor : "gray"
        }`;
      style.border = borderStyling;
      style.outline = borderStyling;
    }
    // チャンクサイズを受け取り、計算する
    const uploadMessage = (this.props.args["uploader_msg"] || "Browse Files to upload.")
    return (
      <main>
        <form
          onClick={() => {
            const inputField = document.querySelector(".input-field") as HTMLInputElement;
            if (inputField) {
              inputField.click();
            }
          }}
          onDragOver={(e) => this.onDragOver(e)}
          onDrop={(e) => this.onDrop(e)}
        >
          <input
            type="file"
            accept="*.*"
            className='input-field'
            hidden
            onChange={this.onFileChange}
            disabled={this.props.disabled || this.state.uploading}
          />
          <MdCloudUpload color='#1475cf' size={60} />
          <p>{uploadMessage}</p>
          {this.state.uploading && (
            <p>Uploading {this.state.loadedChunks} out of {this.getTotalChunks()} chunks...</p>
          )}
          {!this.state.uploading && this.state.loadedChunks > 0 && this.state.loadedChunks === this.getTotalChunks() && (
            <p>Upload completed!</p>
          )}
        </form>
        {this.state.file && (
          <section className='uploaded-row'>
            <FaRegFile size='1.5em' />
            <span className='upload-content'>
              {this.getFileName()}
            </span>
            <RxCross2 size='1em'
              onClick={() => {
                this.deleteUploadedFile()
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

  private deleteUploadedFile = (): void => {
    this.state.file = null;
    const sendData: SendData = {
      mode: UploadMode.Clear,
      data: "",
      fileSize: 0,
      fileName: "",
    };
    this.sendToStreamlitBackend(sendData);
  };

  private getChunkSize = (): number => {
    const file = this.state.file as File;
    const maxFileSize = (this.props.args["chunk_size"] || this.DEFAULT_CHUNK_SIZE_MB) * 1024 * 1024;
    if (file) {
      const sendData: SendData = {
        mode: UploadMode.Single,
        fileName: file.name,
        fileSize: file.size,
        data: null,
        totalChunks: 99999,
        chunkIndex: 99999,
        chunkSize: maxFileSize,
      }
      const jsonString = JSON.stringify(sendData);
      const jsonByteLength = new TextEncoder().encode(jsonString).length;
      return (maxFileSize - jsonByteLength);
    }
    return (maxFileSize - 1024);
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

  private sendToStreamlitBackend = (sendData: SendData): void =>{
    const jsonString = JSON.stringify(sendData);
    const encoder = new TextEncoder();
    const byteData = encoder.encode(jsonString);
    const arrayBuffer = byteData.buffer;
    Streamlit.setComponentValue(arrayBuffer);
  };

  private uploadFile = async (): Promise<void> => {
    if (this.state.file) {
      this.setState({ uploading: true });
      const fileSize = this.state.file.size;
      const fileChunkSize = this.getChunkSize();
      if (fileSize <= fileChunkSize) {
        const file = this.state.file as File;
        const reader = new FileReader();
        reader.onloadend = (e) => {
          // BlobをBinaryStringに変換
          const result = e.target?.result as string;
          const sendData: SendData = {
            mode: UploadMode.Single,
            data: result,
            fileSize: file.size,
            fileName: file.name,
          }
          this.sendToStreamlitBackend(sendData);
          this.setState({ uploading: false });
        };
        reader.readAsBinaryString(file);
      } else {
        await this.uploadFileChunks();
      }
    }
  };

  private uploadFileChunks = async (): Promise<void> => {
    const file = this.state.file as File;
    const fileChunkSize = this.getChunkSize();
    const totalChunks = this.getTotalChunks();
    const sendData: SendData = {
      mode: UploadMode.Multipart,
      fileName: file.name,
      fileSize: file.size,
      data: null,
      totalChunks,
      chunkIndex: -1,
    };
    // バックエンド側はこの値を受け取ることで初期化される
    this.sendToStreamlitBackend(sendData);
    // ここからファイルを送信する
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * fileChunkSize;
      const end = Math.min(start + fileChunkSize, file.size);
      const chunk = file.slice(start, end);
      const reader = new FileReader();
      // BlobをBinaryStringに変換
      reader.onloadend = (e) => {
        const result = e.target?.result as string;
        const sendData: SendData = {
          mode: UploadMode.Multipart,
          fileName: file.name,
          fileSize: file.size,
          data: result,
          totalChunks,
          chunkIndex,
          chunkSize: chunk.size,
        }
        this.sendToStreamlitBackend(sendData);
        // 更新: チャンク数を増やす
        this.setState((prevState) => ({
          loadedChunks: prevState.loadedChunks + 1,
        }));
        // すべてアップロード完了したら、uploadingのステータスを変更する
        if (totalChunks === this.state.loadedChunks) {
          this.setState({ uploading: false });
        }
      };
      reader.readAsBinaryString(chunk);
    }
  };
}

export default withStreamlitConnection(FileUploader);
