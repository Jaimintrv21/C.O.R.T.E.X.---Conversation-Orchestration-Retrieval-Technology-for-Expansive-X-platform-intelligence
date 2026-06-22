import pytest
from unittest.mock import MagicMock
from app.services.artifact_service import ArtifactGenerationService
from datetime import datetime

class MockFirestoreStore:
    def list_messages(self, conversation_id):
        if conversation_id == "c1":
            return [{"role": "user", "content": "ChatGPT marketing discussion.", "created_at": datetime(2023, 1, 1), "provider_slug": "chatgpt"}]
        elif conversation_id == "c2":
            return [{"role": "user", "content": "Claude budget discussion.", "created_at": datetime(2023, 1, 2), "provider_slug": "claude"}]
        elif conversation_id == "c3":
            # Let's make this one very large to force summarization budget cut
            return [{"role": "user", "content": "x" * 60000, "created_at": datetime(2023, 1, 3), "provider_slug": "claude"}] * 2
        return []

@pytest.fixture
def mock_store():
    return MockFirestoreStore()

def test_extract_facts_attribution_and_budget(mock_store):
    service = ArtifactGenerationService(store=mock_store)
    
    conversations = [
        {"id": "c1", "title": "Marketing", "provider_slug": "chatgpt", "created_at": datetime(2023, 1, 1)},
        {"id": "c2", "title": "Budget", "provider_slug": "claude", "created_at": datetime(2023, 1, 2)},
        {"id": "c3", "title": "Large Context", "provider_slug": "claude", "created_at": datetime(2023, 1, 3)},
    ]
    
    facts = service._extract_facts(conversations)
    
    assert facts["conversation_count"] == 3
    # Check the provider breakdown count
    assert facts["source_provider_breakdown"]["chatgpt"] == 1
    assert facts["source_provider_breakdown"]["claude"] == 2
    
    # Check that sources are formatted properly
    text = facts["sources_formatted_text"]
    assert "Marketing" in text
    assert "Budget" in text
    assert "ChatGPT marketing discussion." in text
    assert "[claude] USER: Claude budget discussion." in text
    assert "[chatgpt] USER: ChatGPT marketing discussion." in text

    # Check budget constraints
    assert len(text) <= 105000  # Our budget is ~100k, so it should be truncated
    assert "[SUMMARIZED TO FIT CONTEXT]" in text
