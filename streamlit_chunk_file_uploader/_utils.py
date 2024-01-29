# utils.py
import re
from typing import Dict, Union, Sequence


def convert_keys_to_snake_case(data: Dict[str, any]) -> dict:
    """Convert dictionary keys to snake case

    Args:
        data (Dict[str, any]): dictionary

    Returns:
        dict: dictionary with snake case keys

    """
    return {
        re.sub("([a-z0-9])([A-Z])", r"\1_\2", key).lower(): value
        for key, value in data.items()
    }


def generate_accept_string(extensions: Union[str, Sequence[str], None]) -> str:
    """Generate accept string for file uploader

    Args:
        extensions (Union[str, Sequence[str], None]): extensions to accept

    Returns:
        str: accept string
    """

    if extensions is None:
        return "*.*"
    elif isinstance(extensions, str):
        extensions = [extensions]
    else:
        pass

    return ",".join([f".{ext}" for ext in extensions])
