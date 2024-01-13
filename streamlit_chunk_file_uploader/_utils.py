# utils.py
import re
from typing import Dict

def convert_keys_to_snake_case(data:Dict[str,any]) -> dict:
    """
    辞書のキーをスネークケースに変換するユーティリティ関数
    """
    return {re.sub('([a-z0-9])([A-Z])', r'\1_\2', key).lower(): value for key, value in data.items()}

def combine_chunks(chunk_dict:Dict[str,str]) -> bytes:
    # チャンクIDの順番に並べ替える
    sorted_chunks = sorted(chunk_dict.items())
    # チャンクを結合する(latin-1はreadAsBinaryStringで受け取る文字列をbyteに直すために使う)
    combined_data = ''.join(data for _ , data in sorted_chunks).encode("latin-1")
    return combined_data
