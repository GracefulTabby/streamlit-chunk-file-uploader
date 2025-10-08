from streamlit import util
import io
from typing import Optional, List
from ._utils import convert_keys_to_snake_case
from dataclasses import dataclass
from streamlit.runtime.uploaded_file_manager import UploadedFileRec


class UploadedFile(io.BytesIO):
    """A mutable uploaded file.

    This class extends BytesIO, which has copy-on-write semantics when
    initialized with `bytes`.
    """

    def __init__(self, record: UploadedFileRec):
        # BytesIO's copy-on-write semantics doesn't seem to be mentioned in
        # the Python docs - possibly because it's a CPython-only optimization
        # and not guaranteed to be in other Python runtimes. But it's detailed
        # here: https://hg.python.org/cpython/rev/79a5fbe2c78f
        super().__init__(record.data)
        self.file_id = record.file_id
        self.name = record.name
        self.type = record.type
        self.size = len(record.data)
        # self._file_urls = file_urls

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, UploadedFile):
            return NotImplemented
        return self.file_id == other.file_id

    def __repr__(self) -> str:
        return util.repr_(self)


@dataclass
class FileInfo:
    file_id: str
    file_name: str
    file_size: int
    file_type: str
    total_chunks: Optional[int] = None


@dataclass
class ChunkUploaderReturnValue:
    file_id: str
    file_name: str
    file_size: int
    file_type: str
    total_chunks: Optional[int] = None
    files: Optional[List[FileInfo]] = None

    @staticmethod
    def from_component_value(conponent_value: dict):
        try:
            data = convert_keys_to_snake_case(conponent_value)
            # Handle multiple files if present
            if 'files' in data and data['files']:
                file_infos = [FileInfo(**convert_keys_to_snake_case(f)) for f in data['files']]
                data['files'] = file_infos
            return ChunkUploaderReturnValue(**data)
        except:
            return None
