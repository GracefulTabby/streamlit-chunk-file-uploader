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
