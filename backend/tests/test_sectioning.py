from app.services.sectioning import split_sections

SAMPLE = """
ABSTRACT

A widget for doing things efficiently.

BACKGROUND

Prior widgets were slow and inefficient.

CLAIMS

1. A widget comprising a gear and a lever.
2. The widget of claim 1, further comprising a spring.
"""


def test_split_sections_finds_known_headings() -> None:
    result = split_sections(SAMPLE)
    assert result.abstract is not None and "widget for doing things" in result.abstract
    assert result.background is not None and "Prior widgets" in result.background
    assert result.claims is not None and "gear and a lever" in result.claims


def test_split_sections_falls_back_to_description() -> None:
    result = split_sections("Just some plain text with no headings at all.")
    assert result.abstract is None
    assert result.claims is None
    assert result.description == "Just some plain text with no headings at all."
