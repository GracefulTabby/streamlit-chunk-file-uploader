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
When a file is uploaded, the Python script slices it on the browser side with the specified chunk size and sends it as a binary string through setComponentValue.  
In addition to the binary string, setComponentValue also transmits information such as upload mode, file name, and file size to be received by the backend.  
Therefore, it is important to note that the chunk size and the size of the request may differ.  
In cases where there are constraints such as client_max_body_size, it is necessary to set a value slightly smaller than the constraint size, for example, setting it to 31MB if the constraint is 32MB.
