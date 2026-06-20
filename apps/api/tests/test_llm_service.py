import pytest

from app.config import Settings
from app.services.llm_service import LLMGenerationRequest, LLMRouterService


class FakeClient:
    async def complete(self, *, model: str, messages: list[dict[str, str]], temperature: float) -> str:
        return '{"title":"Test","summary":"Summary","sections":[]}'


@pytest.mark.asyncio
async def test_generate_structured_parses_json() -> None:
    service = LLMRouterService(settings=Settings(), client=FakeClient())

    result = await service.generate_structured(
        LLMGenerationRequest(
            task_type="artifact_generation",
            prompt="Build artifact",
        )
    )

    assert result["title"] == "Test"


def test_local_only_blocks_cloud_fallback_when_no_local_model() -> None:
    service = LLMRouterService(
        settings=Settings(llm_fallback_model="openai/gpt-4o-mini"),
        client=FakeClient(),
    )

    with pytest.raises(ValueError):
        service.resolve_model("unknown-task", local_only=True)
