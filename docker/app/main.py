import streamlit as st
from streamlit_chunk_file_uploader import uploader

st.subheader("Streamlit Chunk File Uploader.")

st.subheader("ChunkUploader")
# chunk_size should be set slightly smaller than client_max_body_size.
file = uploader("World", key="chunk_uploader", chunk_size=31)
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