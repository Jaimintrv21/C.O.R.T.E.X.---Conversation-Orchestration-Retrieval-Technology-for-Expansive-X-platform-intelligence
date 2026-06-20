from types import SimpleNamespace

from app.config import Settings
from app.services.embedding_service import EmbeddingService


class FakeBackend:
    async def encode(self, texts: list[str], model: str) -> list[list[float]]:
        return [[float(len(text.split())), 1.0] for text in texts]


def test_chunk_text_uses_overlap() -> None:
    settings = Settings(
        embedding_chunk_size_tokens=4,
        embedding_chunk_overlap_tokens=1,
    )
    service = EmbeddingService(
        settings=settings,
        local_backend=FakeBackend(),
        cloud_backend=FakeBackend(),
    )

    chunks = service.chunk_text("one two three four five six seven")

    assert chunks == [
        ("one two three four", 4),
        ("four five six seven", 4),
    ]


def test_build_message_chunks_splits_large_messages() -> None:
    settings = Settings(
        embedding_chunk_size_tokens=3,
        embedding_chunk_overlap_tokens=1,
    )
    service = EmbeddingService(
        settings=settings,
        local_backend=FakeBackend(),
        cloud_backend=FakeBackend(),
    )
    message = SimpleNamespace(
        id="message-1",
        conversation_id="conversation-1",
        content="alpha beta gamma delta epsilon",
    )

    chunks = service.build_message_chunks([message])

    assert [chunk.text for chunk in chunks] == [
        "alpha beta gamma",
        "gamma delta epsilon",
    ]
