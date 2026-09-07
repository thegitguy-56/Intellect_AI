"""
Tests for backend/app/services/sectioning.py.

Covers:
- Canonical section detection for all four section types
- Case-insensitive heading match
- Numbered-heading prefix (e.g. "1. CLAIMS")
- Multiple sections of the same canonical type are joined
- Fallback to description when no headings found
- Empty string input
- Real patent heading styles (USPTO format)
- Summary → background fold
"""

import pytest

from app.services.sectioning import SectionedText, split_sections


# ---------------------------------------------------------------------------
# Basic canonical detection
# ---------------------------------------------------------------------------

FULL_SAMPLE = """
ABSTRACT

A system and method for processing patents using machine learning.

BACKGROUND

Prior art systems were slow and error prone.

SUMMARY

The present invention addresses these deficiencies.

CLAIMS

1. A method comprising: receiving a document; analyzing the document.
2. The method of claim 1, further comprising storing results.

DETAILED DESCRIPTION

The preferred embodiments are described hereinafter.
"""


def test_full_sample_all_sections():
    r = split_sections(FULL_SAMPLE)
    assert r.abstract is not None and "machine learning" in r.abstract
    # summary folds into background
    assert r.background is not None and "Prior art" in r.background
    assert r.background is not None and "present invention" in r.background
    assert r.claims is not None and "method comprising" in r.claims.lower()
    assert r.description is not None and "preferred embodiments" in r.description


def test_abstract_only():
    text = "\nABSTRACT\n\nAn invention for testing.\n"
    r = split_sections(text)
    assert r.abstract is not None and "testing" in r.abstract
    assert r.claims is None
    assert r.background is None


def test_claims_only():
    text = "\nCLAIMS\n\n1. A widget comprising a gear.\n"
    r = split_sections(text)
    assert r.claims is not None and "widget" in r.claims
    assert r.abstract is None


def test_background_only():
    text = "\nBACKGROUND\n\nPrior art lacks novelty.\n"
    r = split_sections(text)
    assert r.background is not None and "Prior art" in r.background


def test_description_only():
    text = "\nDETAILED DESCRIPTION\n\nEmbodiment A is described.\n"
    r = split_sections(text)
    assert r.description is not None and "Embodiment A" in r.description


# ---------------------------------------------------------------------------
# Case insensitivity
# ---------------------------------------------------------------------------

def test_lowercase_headings():
    text = "\nabstract\n\nLower case abstract text.\n\nclaims\n\n1. A claim.\n"
    r = split_sections(text)
    assert r.abstract is not None and "Lower case" in r.abstract
    assert r.claims is not None and "A claim" in r.claims


def test_mixed_case_headings():
    text = "\nAbstract\n\nMixed case abstract.\n\nBackground\n\nMixed case background.\n"
    r = split_sections(text)
    assert r.abstract is not None and "Mixed case abstract" in r.abstract
    assert r.background is not None and "Mixed case background" in r.background


# ---------------------------------------------------------------------------
# Numbered heading prefixes
# ---------------------------------------------------------------------------

def test_numbered_heading_prefix():
    text = "\n1. CLAIMS\n\nClaim numbered.\n"
    r = split_sections(text)
    assert r.claims is not None and "Claim numbered" in r.claims


# ---------------------------------------------------------------------------
# Multiple occurrences of same section type are joined
# ---------------------------------------------------------------------------

def test_multiple_claim_sections_joined():
    text = """
CLAIMS

1. First claim.

BACKGROUND

Background text here.

CLAIMS

2. Second claim.
"""
    r = split_sections(text)
    assert r.claims is not None
    assert "First claim" in r.claims
    assert "Second claim" in r.claims


# ---------------------------------------------------------------------------
# Fallback to description
# ---------------------------------------------------------------------------

def test_no_headings_fallback_to_description():
    text = "Just some plain text with no recognizable headings at all."
    r = split_sections(text)
    assert r.abstract is None
    assert r.claims is None
    assert r.background is None
    assert r.description == text


def test_empty_string_returns_all_none():
    r = split_sections("")
    assert r.abstract is None
    assert r.claims is None
    assert r.background is None
    assert r.description is None


def test_whitespace_only_returns_all_none():
    r = split_sections("   \n\n   \n")
    assert r.abstract is None
    assert r.claims is None
    assert r.background is None
    assert r.description is None


# ---------------------------------------------------------------------------
# Summary → background fold
# ---------------------------------------------------------------------------

def test_summary_folded_into_background():
    text = "\nSUMMARY\n\nA summary of the invention.\n"
    r = split_sections(text)
    assert r.background is not None and "summary of the invention" in r.background.lower()
    # There should be no standalone "summary" key — it goes into background
    assert not hasattr(r, "summary")


def test_summary_and_background_both_fold():
    text = "\nBACKGROUND\n\nBackground text.\n\nSUMMARY\n\nSummary text.\n"
    r = split_sections(text)
    assert r.background is not None
    assert "Background text" in r.background
    assert "Summary text" in r.background


# ---------------------------------------------------------------------------
# USPTO-style alternative heading variants
# ---------------------------------------------------------------------------

def test_background_of_the_invention():
    text = "\nBACKGROUND OF THE INVENTION\n\nLong history here.\n"
    r = split_sections(text)
    assert r.background is not None and "Long history" in r.background


def test_field_of_invention():
    text = "\nFIELD OF THE INVENTION\n\nThis invention relates to widgets.\n"
    r = split_sections(text)
    assert r.background is not None and "widgets" in r.background


def test_what_is_claimed():
    text = "\nWHAT IS CLAIMED IS\n\n1. A device.\n"
    r = split_sections(text)
    assert r.claims is not None and "A device" in r.claims


def test_i_claim_variant():
    text = "\nI CLAIM\n\n1. An invention.\n"
    r = split_sections(text)
    assert r.claims is not None and "invention" in r.claims


def test_summary_of_invention():
    text = "\nSUMMARY OF THE INVENTION\n\nThe invention summarized.\n"
    r = split_sections(text)
    assert r.background is not None and "invention summarized" in r.background.lower()


# ---------------------------------------------------------------------------
# Return type is SectionedText dataclass
# ---------------------------------------------------------------------------

def test_return_type_is_sectioned_text():
    r = split_sections(FULL_SAMPLE)
    assert isinstance(r, SectionedText)


# ---------------------------------------------------------------------------
# Heading with trailing colon
# ---------------------------------------------------------------------------

def test_heading_with_trailing_colon():
    text = "\nABSTRACT:\n\nText after colon heading.\n"
    r = split_sections(text)
    assert r.abstract is not None and "Text after colon" in r.abstract
