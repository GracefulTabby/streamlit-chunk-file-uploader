import streamlit as st
from streamlit_chunk_file_uploader import uploader

st.subheader("Streamlit Chunk File Uploader.")

st.subheader("ChunkUploader")
file = uploader(
    "World",
    uploader_msg="CSVファイルをアップロードしてください",
    key="chunk_uploader",
    chunk_size=16,
    on_change=lambda:st.write("upload")
)
st.write(file)
if file is not None:
    st.download_button(
        "download",
        data=file,
        file_name=file.name,
        type="primary",
    )

st.subheader("st.file_uploader")
file_2 = st.file_uploader("st.file_uploader")
st.write(file_2)

if file_2 is not None:
    st.download_button(
        "download(from st.file_uploader)",
        data=file_2,
        type="primary",
    )
