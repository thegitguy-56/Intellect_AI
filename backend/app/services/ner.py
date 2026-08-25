import spacy
from spacy.language import Language

from app.core.config import get_settings

settings = get_settings()

_nlp: Language | None = None

_LABEL_MAP = {
    "PERSON": "person",
    "ORG": "org",
    "DATE": "date",
    "MONEY": "monetary",
}


def get_nlp() -> Language:
    global _nlp
    if _nlp is None:
        _nlp = spacy.load(settings.spacy_model_name)
    return _nlp


def extract_entities(text: str) -> list[dict]:
    nlp = get_nlp()
    # spaCy's max_length guards against runaway memory use; patents can run
    # long, so cap rather than raise the limit unbounded on Render's free tier.
    truncated = text[: nlp.max_length]

    doc = nlp(truncated)
    entities: list[dict] = []
    for ent in doc.ents:
        mapped = _LABEL_MAP.get(ent.label_)
        if mapped is None:
            continue
        entities.append(
            {
                "entity_type": mapped,
                "entity_value": ent.text,
                "span_start": ent.start_char,
                "span_end": ent.end_char,
            }
        )
    return entities
