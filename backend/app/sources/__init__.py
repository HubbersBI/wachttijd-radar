"""One interface, two implementations, chosen by environment variable."""

import os

from .base import TREATMENT_TYPES, Wachttijd, WachttijdSource, now_iso
from .nza import NzaSource
from .synthetic import SyntheticSource

__all__ = [
    "TREATMENT_TYPES",
    "NzaSource",
    "SyntheticSource",
    "Wachttijd",
    "WachttijdSource",
    "create_source",
    "now_iso",
]


def create_source() -> WachttijdSource:
    """Returns the synthetic generator when WACHTTIJD_SOURCE=synthetic, else the NZa adapter."""
    if os.environ.get("WACHTTIJD_SOURCE", "nza").lower() == "synthetic":
        return SyntheticSource()
    return NzaSource()
