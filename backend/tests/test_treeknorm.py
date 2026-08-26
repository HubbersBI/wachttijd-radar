"""The norm check. Its job is to be right at the edges and honest in the middle."""

import pytest

from app.treeknorm import DEPENDS, EXCEEDED, WITHIN, norm_for, verdict


@pytest.mark.parametrize(
    ("treatment_type", "days", "expected"),
    [
        ("Polikliniekbezoek", 27, WITHIN),
        ("Polikliniekbezoek", 28, WITHIN),  # 4 weeks exactly is still within
        ("Polikliniekbezoek", 29, EXCEEDED),
        ("Diagnostiek", 28, WITHIN),
        ("Diagnostiek", 29, EXCEEDED),
        ("Behandeling", 42, WITHIN),  # 6 weeks: within under either reading
        ("Behandeling", 43, DEPENDS),
        ("Behandeling", 49, DEPENDS),  # 7 weeks: within only if klinisch
        ("Behandeling", 50, EXCEEDED),  # over under either reading
    ],
)
def test_verdict_at_the_boundaries(treatment_type, days, expected):
    assert verdict(treatment_type, days) == expected


def test_no_verdict_without_a_number():
    """A row with insufficient observations has no wait to judge."""
    assert verdict("Behandeling", None) is None


def test_behandeling_is_a_range_because_the_source_cannot_say_which():
    """NR/REG-2421 submits treatment waits as one category; TH/BR-025 sets 6 and 7."""
    assert norm_for("Behandeling") == (42, 49)


def test_a_treatment_type_we_do_not_have_a_norm_for_gets_no_verdict():
    assert verdict("Iets anders", 100) is None


def test_the_utrecht_comparison_reads_as_expected():
    """The case the app exists for: same treatment, four hospitals, one city."""
    assert verdict("Behandeling", 30) == WITHIN
    assert verdict("Behandeling", 68) == EXCEEDED
    assert verdict("Behandeling", 256) == EXCEEDED
    assert verdict("Behandeling", None) is None
