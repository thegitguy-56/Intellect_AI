import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer

from app.core.config import get_settings

settings = get_settings()

# Deliberately not a trained embedding model (no sentence-transformers/torch) —
# this is a course capstone project, not a production search system, and a
# multi-hundred-MB deep learning dependency isn't worth it for free-tier
# hosting. HashingVectorizer is stateless (no fitting/persistence needed,
# no model download) and produces a fixed-size dense vector per document via
# the hashing trick over word/bigram counts. It captures lexical overlap
# rather than deep semantics, which is a real quality tradeoff — documented
# in docs/ARCHITECTURE.md — but is enough to demonstrate the full
# embed -> pgvector cosine-similarity -> retrieval pipeline end to end.
_vectorizer = HashingVectorizer(
    n_features=settings.embedding_dim,
    alternate_sign=False,
    ngram_range=(1, 2),
    norm="l2",
)

MAX_CHARS = 5000


def embed_text(text: str) -> list[float]:
    vector = _vectorizer.transform([text[:MAX_CHARS]])
    return vector.toarray()[0].astype(np.float32).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    matrix = _vectorizer.transform([t[:MAX_CHARS] for t in texts])
    return matrix.toarray().astype(np.float32).tolist()
