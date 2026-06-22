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


def test_local_only_blocks_cloud_suffix() -> None:
    service = LLMRouterService(
        settings=Settings(),
        client=FakeClient(),
    )

    with pytest.raises(ValueError, match="glm-5.2:cloud is a cloud-hosted model"):
        service.resolve_model("primary_chat", override_model="glm-5.2:cloud", local_only=True)


def test_resolve_model_primary_chat() -> None:
    service = LLMRouterService(
        settings=Settings(primary_chat_model="glm-5.2:cloud"),
        client=FakeClient(),
    )

    model = service.resolve_model("primary_chat", local_only=False)
    assert model == "glm-5.2:cloud"
