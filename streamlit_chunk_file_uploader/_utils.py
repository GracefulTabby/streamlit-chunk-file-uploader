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
        # Check if it's a MIME type
        if "/" in extensions:
            return extensions
        extensions = [f".{extensions.strip().lstrip('.')}"]
    else:
        # If it's a sequence, handle each extension accordingly
        ext_list = []
        for ext_item in extensions:
            if isinstance(ext_item, str):
                # Check if it's a MIME type
                if "/" in ext_item:
                    ext_list.append(ext_item)
                else:
                    ext_list.append(f".{ext_item.strip().lstrip('.')}")
            else:
                raise TypeError("Each extension must be a string.")
        extensions = ext_list

    return ",".join([ext for ext in extensions])