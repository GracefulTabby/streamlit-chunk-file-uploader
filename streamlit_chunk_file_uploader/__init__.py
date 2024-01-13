import os
import streamlit.components.v1 as components
import streamlit as st
from typing import (
    List,
    Any,
    Dict,
    Optional,
    Union,
    Sequence,
    Callable,
    Tuple,
)
from typing_extensions import Literal
from ._models import UploadedFile, ChunkUploaderReturnValue
from ._utils import combine_chunks

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
    uploader_msg: str = "Browse Files to upload.",
    show_progress: bool = True,
) -> Optional[UploadedFile]:
    """Create a new instance of the file uploader component.

    Parameters
    ----------
    label: str
        The label or title for the file uploader.
    type: Union[str, Sequence[str], None], optional
        [NOT YET IMPLEMENTED] The type or types of files that the uploader accepts. It can be a string
        (e.g., 'image/jpeg'), a sequence of strings, or None for all types.
    key: str or None, optional
        An optional key that uniquely identifies this file uploader. If set, it
        allows the component to maintain state across re-renders. If None, the
        component will be re-mounted, losing its current state on changes.
    help: str, optional
        [NOT YET IMPLEMENTED] Additional help or description for the file uploader.
    on_change: Callable, optional
        [NOT YET IMPLEMENTED] A callback function to be invoked when the files are changed or uploaded.
    args: Tuple[Any, ...], optional
        [NOT YET IMPLEMENTED] Additional arguments to be passed to the callback function.
    kwargs: Dict[str, Any], optional
        [NOT YET IMPLEMENTED] Additional keyword arguments to be passed to the callback function.
    disabled: bool, optional
        [NOT YET IMPLEMENTED] If True, the file uploader is disabled and cannot be interacted with.
    label_visibility: Literal["visible", "hidden", "collapsed"], optional
        [NOT YET IMPLEMENTED] The visibility setting for the label ('visible', 'hidden', or 'collapsed').
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
    # session_stateのキーを作成
    FILE_TEMP_STATE_KEY = f"{key}__temp_storage"
    RECV_NOW_FLG_KEY = f"{key}__recv_now_flg"
    FILE_STORAGE_KEY = f"{key}__file"

    # コンポーネントからファイルを受け取る
    component_value = _component_func(
        label=label,
        type=type,
        uploader_msg=uploader_msg,
        chunk_size=chunk_size,
        key=key,
        disabled=disabled,
        label_visibility=label_visibility,
        default=0,
    )
    rv = ChunkUploaderReturnValue.from_component_value(component_value)
    # アップロードされていない場合等はNoneを受け取る
    if rv is None:
        return st.session_state.get(FILE_STORAGE_KEY)
    # クリアが指定されている場合には、ファイルをクリアする
    if rv.is_file_clear():
        st.session_state.pop(FILE_TEMP_STATE_KEY, None)
        st.session_state.pop(RECV_NOW_FLG_KEY, None)
        st.session_state.pop(FILE_STORAGE_KEY, None)

    def __call_on_change():
        # TODO: ファイルが変化したときにのみ実行するように実装する
        # TODO: ファイルハッシュで比較するか
        if on_change is not None:
            on_change(
                *(args if args is not None else ()),
                **(kwargs if kwargs is not None else {}),
            )

    # モード別に処理(singlepart/multipart)
    if rv.mode == "singlepart":
        # __call_on_change()
        st.session_state[FILE_STORAGE_KEY] = UploadedFile(
            rv.data.encode("latin-1"),
            rv.file_name,
            os.path.splitext(rv.file_name)[-1].replace(".", ""),
        )
    elif rv.mode == "multipart":
        if rv.chunk_index == -1:
            # -1は送信の始まり
            st.session_state[RECV_NOW_FLG_KEY] = True
            st.session_state.pop(FILE_STORAGE_KEY, None)
            st.session_state.pop(FILE_TEMP_STATE_KEY, None)
        if FILE_TEMP_STATE_KEY not in st.session_state:
            st.session_state[FILE_TEMP_STATE_KEY] = {}
        # データを格納
        if (
            rv.data is not None
            and rv.chunk_index not in st.session_state[FILE_TEMP_STATE_KEY]
        ):
            st.session_state[FILE_TEMP_STATE_KEY][rv.chunk_index] = rv.data
        # すべてのチャンクがそろったら結合してファイル化する
        if len(st.session_state[FILE_TEMP_STATE_KEY]) == rv.total_chunks:
            data = combine_chunks(st.session_state[FILE_TEMP_STATE_KEY])
            st.session_state[FILE_STORAGE_KEY] = UploadedFile(
                data,
                rv.file_name,
                os.path.splitext(rv.file_name)[-1].replace(".", ""),
            )
            st.session_state.pop(FILE_TEMP_STATE_KEY, None)
            st.session_state[RECV_NOW_FLG_KEY] = False
            st.session_state.pop(key,None)
            # __call_on_change()
        if show_progress and st.session_state[RECV_NOW_FLG_KEY]:
            now_length = len(st.session_state.get(FILE_TEMP_STATE_KEY,""))
            progress = now_length / rv.total_chunks
            if progress:
                st.progress(progress, "アップロードされたファイルを処理しています、しばらくお待ちください...")
    else:
        pass

    return st.session_state.get(FILE_STORAGE_KEY)
