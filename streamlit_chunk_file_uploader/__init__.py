import os
import streamlit.components.v1 as components
from streamlit.runtime.scriptrunner import get_script_run_ctx
from typing import (
    List,
    Any,
    Dict,
    Optional,
    Union,
    Sequence,
    Callable,
    Tuple,
    TYPE_CHECKING,
)
from typing_extensions import Literal
from ._models import UploadedFile, ChunkUploaderReturnValue
from ._utils import generate_accept_string
from streamlit.runtime.uploaded_file_manager import UploadedFileRec
from streamlit import session_state

if TYPE_CHECKING:
    from streamlit.runtime.memory_uploaded_file_manager import MemoryUploadedFileManager

# Create a _RELEASE constant. We'll set this to False while we're developing
# the component, and True when we're ready to package and distribute it.
# (This is, of course, optional - there are innumerable ways to manage your
# release process.)
_RELEASE = True
COMPONENT_NAME = "chunk_uploader"

if not _RELEASE:
    _component_func = components.declare_component(
        COMPONENT_NAME,
        url="http://localhost:3001",
    )
else:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component(COMPONENT_NAME, path=build_dir)


def __get_files_from_file_storage(
    rv: ChunkUploaderReturnValue,
) -> Optional[UploadedFile]:
    if rv is None:
        return None
    # Do not proceed if there is no file id
    if rv.file_id is None:
        return None
    # Get the context
    ctx = get_script_run_ctx()
    session_id = ctx.session_id
    # Get the streamlit upload manager
    uploaded_file_mgr: "MemoryUploadedFileManager" = ctx.uploaded_file_mgr
    # Get the file data associated with the session_id
    file_storage: Dict[str, UploadedFileRec] = uploaded_file_mgr.file_storage.get(
        session_id, {}
    )
    # In the case of multipart, the format will be {uuid}.{chunk_id}, so we need to retrieve it
    file_ids = [k for k in file_storage.keys() if k.startswith(rv.file_id)]
    if len(file_ids) > 1:
        # Raise an exception if the number of files doesn't match
        if rv.total_chunks != len(file_ids):
            raise Exception("Upload failed!!")
        sorted_file_ids = list(sorted(file_ids, key=lambda x: int(x.split(".")[1])))
        combined_bytes = b""
        for file_id in sorted_file_ids:
            record = uploaded_file_mgr.get_files(session_id, file_ids=[file_id])[0]
            combined_bytes += record.data
            uploaded_file_mgr.remove_file(session_id, file_id)
        if len(combined_bytes) != rv.file_size:
            raise Exception("File sizes do not match!!!")
        # Register
        combined_file = UploadedFileRec(
            rv.file_id, rv.file_name, rv.file_type, combined_bytes
        )
        uploaded_file_mgr.add_file(session_id, combined_file)
        del combined_bytes, combined_file
    # Get the file
    record = uploaded_file_mgr.get_files(session_id, [rv.file_id])[0]
    return UploadedFile(record)


def uploader(
    label: str,
    type: Union[str, Sequence[str], None] = None,
    key: Optional[str] = None,
    help: Optional[str] = None,
    on_change: Optional[Callable] = None,
    args: Optional[Tuple[Any, ...]] = None,
    kwargs: Optional[Dict[str, Any]] = None,
    disabled: bool = False,
    label_visibility: Literal["visible", "hidden", "collapsed"] = "visible",
    chunk_size: int = 32,
    uploader_msg: str = "Drag and drop file here",
) -> Optional[UploadedFile]:
    """Create a new instance of the file uploader component.

    Parameters
    ----------
    label: str
        The label or title for the file uploader.
    type: Union[str, Sequence[str], None], optional
        The type or types of files that the uploader accepts. It can be a string
        (e.g., 'image/jpeg'), a sequence of strings, or None for all types.
    key: str or None, optional
        An optional key that uniquely identifies this file uploader. If set, it
        allows the component to maintain state across re-renders. If None, the
        component will be re-mounted, losing its current state on changes.
    help: str, optional
        [NOT YET IMPLEMENTED] Additional help or description for the file uploader.
    on_change: Callable, optional
        A callback function to be invoked when the files are changed or uploaded.
    args: Tuple[Any, ...], optional
        Additional arguments to be passed to the callback function.
    kwargs: Dict[str, Any], optional
        Additional keyword arguments to be passed to the callback function.
    disabled: bool, optional
        If True, the file uploader is disabled and cannot be interacted with.
    label_visibility: Literal["visible", "hidden", "collapsed"], optional
        The visibility setting for the label ('visible', 'hidden', or 'collapsed').
    chunk_size: int, optional
        The size in bytes at which files exceeding this limit will be chunked
        and sent in separate parts during transmission to the frontend.
    uploader_msg: str, optional
        The message displayed in the file uploader, prompting users to browse
        and upload files.

    Returns
    -------
    Optional[UploadedFile]
        The uploaded file object or None if no file is uploaded.
    """
    _CV_KEY = f"_{key}_cv"
    _CV_PREV_KEY = f"{_CV_KEY}_prev"

    ctx = get_script_run_ctx()
    session_id = ctx.session_id
    uploaded_file_mgr: MemoryUploadedFileManager = ctx.uploaded_file_mgr
    endpoint = uploaded_file_mgr.endpoint
    # Receive files from the component
    component_value = _component_func(
        label=label,
        accept=generate_accept_string(type),
        uploader_msg=uploader_msg,
        chunk_size=chunk_size,
        key=_CV_KEY,
        disabled=disabled,
        label_visibility=label_visibility,
        default=None,
        session_id=session_id,
        endpoint=endpoint,
    )
    rv = ChunkUploaderReturnValue.from_component_value(component_value)
    file = __get_files_from_file_storage(rv)
    # Get the previous state
    prev_cv: Optional[dict] = session_state.get(_CV_PREV_KEY)
    # Rewrite file and execute on_change if the state is different
    if prev_cv != component_value:
        session_state[key] = file
        session_state[_CV_PREV_KEY] = component_value
        if on_change is not None:
            on_change(
                *(args if args is not None else ()),
                **(kwargs if kwargs is not None else {}),
            )
    return file
