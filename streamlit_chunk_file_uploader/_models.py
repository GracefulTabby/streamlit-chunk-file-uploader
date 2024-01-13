from streamlit import util
import io
import json
from typing import Optional
from typing_extensions import Literal
from ._utils import convert_keys_to_snake_case


class UploadedFile(io.BytesIO):
    """A mutable uploaded file.

    This class extends BytesIO, which has copy-on-write semantics when
    initialized with `bytes`.
    """

    def __init__(self, data: bytes, name: str, ext: str):
        # BytesIO's copy-on-write semantics doesn't seem to be mentioned in
        # the Python docs - possibly because it's a CPython-only optimization
        # and not guaranteed to be in other Python runtimes. But it's detailed
        # here: https://hg.python.org/cpython/rev/79a5fbe2c78f
        super().__init__(data)
        self.name = name
        self.ext = ext
        self.size = len(data)

    # def __eq__(self, other: object) -> bool:
    #     if not isinstance(other, UploadedFile):
    #         return NotImplemented
    #     return self.file_id == other.file_id

    def __repr__(self) -> str:
        return util.repr_(self)


class ChunkUploaderReturnValue:
    def __init__(
        self,
        mode: Literal["singlepart", "multipart", "clear"],
        file_name: str,
        file_size: int,
        data: str,
        total_chunks: Optional[int] = None,
        chunk_index: Optional[int] = None,
        chunk_size: Optional[int] = None,
    ):
        self.mode = mode
        self.file_name = file_name
        self.file_size = file_size
        self.data = data
        self.total_chunks = total_chunks
        self.chunk_index = chunk_index
        self.chunk_size = chunk_size

    @staticmethod
    def from_component_value(json_bytes: bytes):
        try:
            decoded_json = json.loads(json_bytes.decode('utf-8'))
            return ChunkUploaderReturnValue(
                **convert_keys_to_snake_case(decoded_json)
            )
        except:
            return None

    def is_file_clear(self) -> bool:
        if self.mode == "clear":
            return True
        return False
    
    def __repr__(self):
        return (
            f"ChunkUploaderReturnValue(mode={self.mode}, "
            f"file_name={self.file_name}, "
            f"file_size={self.file_size}, "
            f"data=len({len(self.data)}), "
            f"total_chunks={self.total_chunks}, "
            f"chunk_index={self.chunk_index}, "
            f"chunk_size={self.chunk_size})"
        )