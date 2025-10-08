import streamlit as st
from streamlit_chunk_file_uploader import uploader


def index() -> None:
    st.subheader("Streamlit Chunk File Uploader Demo!")
    # ChunkFileUploader example.
    st.subheader("ChunkUploader",divider=True)
    # IMPORTANT: If there are constraints, set the chunk size a little smaller.
    file = uploader(
        "chunk file uploader (No Limit)",
        key="chunk_uploader",
        uploader_msg="Drag and drop Large file here",
        chunk_size=31,
    )
    st.write(file)
    if file is not None:
        st.download_button(
            "download",
            data=file,
            file_name=file.name,
            type="primary",
        )
    
    # Example with file size limit
    st.subheader("ChunkUploader with 10MB limit",divider=True)
    file_limited = uploader(
        "chunk file uploader (10MB Limit)",
        key="chunk_uploader_limited",
        uploader_msg="Drag and drop file here (max 10MB)",
        chunk_size=5,
        max_file_size=10,
    )
    st.write(file_limited)
    if file_limited is not None:
        st.download_button(
            "download (limited)",
            data=file_limited,
            file_name=file_limited.name,
            type="primary",
            key="download_limited",
        )
    
    # streamlit file_uploader example.
    st.subheader("st.file_uploader",divider=True)
    file_2 = st.file_uploader(
        "Upload the file",
    )
    st.write(file_2)

    if file_2 is not None:
        st.download_button(
            "download(from st.file_uploader)",
            data=file_2,
            type="primary",
        )

    # Prove that you haven't rerun
    count = st.session_state.get("count", 0)
    st.subheader(f"rerun count: {count}")
    st.session_state["count"] = count + 1

    return


if __name__ == "__main__":
    index()
