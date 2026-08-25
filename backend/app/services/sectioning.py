import re
from dataclasses import dataclass

# Rule-based section splitting: patents follow fairly predictable heading
# conventions (all-caps or title-case headers on their own line). This is
# intentionally simple/regex-based rather than ML-based — reserves the Groq
# LLM budget for tasks that need real reasoning (see docs/PROJECT_BUILD_PLAN.md
# Section 8), and headings are regular enough that rules generalize well.
_HEADING_PATTERNS: dict[str, list[str]] = {
    "abstract": [r"abstract"],
    "background": [r"background(?: of the invention)?", r"field of (?:the )?invention"],
    "summary": [r"summary(?: of the invention)?"],
    "claims": [r"claims?", r"what is claimed is", r"i claim", r"we claim"],
    "description": [
        r"detailed description(?: of.*)?",
        r"description of.*embodiments?",
        r"description",
        r"brief description of the drawings",
    ],
}

_HEADING_RE = re.compile(
    r"^\s*(?:[0-9]+[.)]\s*)?("
    + "|".join(p for patterns in _HEADING_PATTERNS.values() for p in patterns)
    + r")\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)


def _canonical_section(heading_text: str) -> str | None:
    heading_lower = heading_text.strip().lower()
    for canonical, patterns in _HEADING_PATTERNS.items():
        for pattern in patterns:
            if re.fullmatch(pattern, heading_lower, re.IGNORECASE):
                return canonical
    return None


@dataclass
class SectionedText:
    abstract: str | None = None
    background: str | None = None
    claims: str | None = None
    description: str | None = None


def split_sections(text: str) -> SectionedText:
    matches = list(_HEADING_RE.finditer(text))
    result = SectionedText()

    if not matches:
        # No recognizable headings — best effort: treat the whole document
        # as description text so at least something is captured.
        result.description = text.strip() or None
        return result

    buckets: dict[str, list[str]] = {}
    for i, match in enumerate(matches):
        canonical = _canonical_section(match.group(1))
        if canonical is None:
            continue
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunk = text[start:end].strip()
        if not chunk:
            continue
        # "summary" isn't its own DB column — fold it into background.
        key = "background" if canonical == "summary" else canonical
        buckets.setdefault(key, []).append(chunk)

    result.abstract = "\n\n".join(buckets.get("abstract", [])) or None
    result.background = "\n\n".join(buckets.get("background", [])) or None
    result.claims = "\n\n".join(buckets.get("claims", [])) or None
    result.description = "\n\n".join(buckets.get("description", [])) or None
    return result
