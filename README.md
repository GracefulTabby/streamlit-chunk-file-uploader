# streamlit-chunk-file-uploader

[![image](https://img.shields.io/pypi/v/streamlit-chunk-file-uploader.svg)](https://pypi.python.org/pypi/streamlit-chunk-file-uploader)  
[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://chunk-file-uploader.streamlit.app/)  

This is a custom component that allows you to split files and send them from your browser to Streamlit.

## Installation instructions

```sh
pip install streamlit-chunk-file-uploader
```

## Usage instructions

### Single File Upload

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

### Multiple File Upload

```python
import streamlit as st
from streamlit_chunk_file_uploader import uploader

files = uploader(
    "uploader", 
    key="chunk_uploader_multiple", 
    chunk_size=32,
    accept_multiple_files=True
)
st.write(files)
if files is not None:
    for file in files:
        st.download_button(
            f"download {file.name}",
            data=file,
            file_name=file.name,
            type="primary",
        )
```

## Parameters

- **label** (str): The label or title for the file uploader.
- **type** (Union[str, Sequence[str], None], optional): The type or types of files that the uploader accepts. It can be a string (e.g., 'image/jpeg'), a sequence of strings, or None for all types.
- **key** (str or None, optional): An optional key that uniquely identifies this file uploader.
- **help** (str, optional): Additional help or description for the file uploader. *(Not yet implemented)*
- **on_change** (Callable, optional): A callback function to be invoked when the files are changed or uploaded.
- **args** (Tuple[Any, ...], optional): Additional arguments to be passed to the callback function.
- **kwargs** (Dict[str, Any], optional): Additional keyword arguments to be passed to the callback function.
- **disabled** (bool, optional): If True, the file uploader is disabled and cannot be interacted with.
- **label_visibility** (Literal["visible", "hidden", "collapsed"], optional): The visibility setting for the label.
- **chunk_size** (int, optional): The size in MB at which files exceeding this limit will be chunked. Default is 32 MB.
- **uploader_msg** (str, optional): The message displayed in the file uploader. Default is "Drag and drop file here".
- **accept_multiple_files** (bool, optional): If True, allows multiple files to be uploaded at once. Default is False.

## Returns

- When `accept_multiple_files=False`: Returns a single `UploadedFile` object or `None` if no file is uploaded.
- When `accept_multiple_files=True`: Returns a list of `UploadedFile` objects or `None` if no files are uploaded.

## About chunk size
When a file is uploaded, a Python script slices the file at the specified chunk size on the browser side and sends it as multiple files to the backend.  
It's important to note that chunk size and request size are different.  
If you have a constraint such as client_max_body_size, you should set it to a value slightly smaller than the constraint size, such as 31MB if the constraint size is 32MB.  
