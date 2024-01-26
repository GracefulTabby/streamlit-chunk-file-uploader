# utils.py
import re
from typing import Dict


def convert_keys_to_snake_case(data: Dict[str, any]) -> dict:
    """
    辞書のキーをスネークケースに変換するユーティリティ関数
    """
    return {
        re.sub("([a-z0-9])([A-Z])", r"\1_\2", key).lower(): value
        for key, value in data.items()
    }
