"""Treeknormen: the maximum acceptable waiting times, and the verdict against them.

Policy, not data - so this lives in code and never in the database.

Source: NZa Beleidsregel toezichtkader zorgplicht zorgverzekeraars Zvw (TH/BR-025).
Note what the norm actually binds: it is the framework for the *insurer's* zorgplicht,
not a rule the hospital breaks. Exceeding it is what entitles someone to ask their
insurer for zorgbemiddeling.

Behandeling is a range on purpose. TH/BR-025 sets 6 weeks for poliklinische and 7 for
klinische behandeling, but NR/REG-2421 art. 4 lid 5 has providers submit treatment
waiting times as one undifferentiated category, so the source cannot say which applies.
RIVM/VZinfo publishes the same figures against "een treeknorm van 6 of 7 weken" for
this reason. We report the range and say when a wait falls inside it, rather than
picking a norm the source does not support.
"""

WITHIN = "within"
EXCEEDED = "exceeded"
DEPENDS = "depends"

# treatment_type -> (strictest norm in days, most lenient norm in days)
NORMS: dict[str, tuple[int, int]] = {
    "Polikliniekbezoek": (28, 28),  # 4 weeks
    "Diagnostiek": (28, 28),  # 4 weeks
    "Behandeling": (42, 49),  # 6 weeks poliklinisch, 7 weeks klinisch
}


def norm_for(treatment_type: str) -> tuple[int, int] | None:
    return NORMS.get(treatment_type)


def verdict(treatment_type: str, days: int | None) -> str | None:
    """Where a wait falls against the norm.

    None when there is no wait to judge - a row with insufficient observations has no
    number, and inventing a verdict for it would be worse than showing none.

    DEPENDS when the wait sits inside the 6-to-7-week band for a behandeling: over the
    norm if the treatment is poliklinisch, within it if klinisch, and the source does
    not say which. That is a real ambiguity and it is reported, not resolved.
    """
    if days is None:
        return None
    norm = norm_for(treatment_type)
    if norm is None:
        return None
    strictest, lenient = norm
    if days <= strictest:
        return WITHIN
    if days > lenient:
        return EXCEEDED
    return DEPENDS
