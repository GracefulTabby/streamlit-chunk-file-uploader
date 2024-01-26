# streamlit-chunk-file-uploader

This is a custom component that allows you to split files and send them from your browser to Streamlit.

## Installation instructions

```sh
pip install streamlit-chunk-file-uploader
```

## Usage instructions

```python
import streamlit as st
from streamlit_chunk_file_uploader import uploader

file = uploader("uploader", key="chunk_uploader", chunk_size=32)
st.write(file)
if file is not None:
    st.download_button(
        "download",
        data=file,
        file_name=file.name,
        type="primary",
    )

```

## About chunk size
When a file is uploaded, a Python script slices the file at the specified chunk size on the browser side and sends it as multiple files to the backend.  
It's important to note that chunk size and request size are different.  
If you have a constraint such as client_max_body_size, you should set it to a value slightly smaller than the constraint size, such as 31MB if the constraint size is 32MB.  