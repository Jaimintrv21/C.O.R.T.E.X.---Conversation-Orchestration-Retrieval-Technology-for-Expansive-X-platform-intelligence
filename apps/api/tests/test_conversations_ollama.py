import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.routers.conversations import _get_ollama_chat_response, _stream_ollama_chat


class MockMessage:
    def __init__(self, content):
        self.content = content


class MockChatResponse:
    def __init__(self, content):
        self.message = MockMessage(content)


@pytest.mark.asyncio
async def test_get_ollama_chat_response():
    messages = [
        {"role": "user", "content": "How to write a pytest?"}
    ]
    
    # Mock search result
    mock_hit = MagicMock()
    mock_hit.title = "Pytest Guide"
    mock_hit.snippet = "Use @pytest.mark.asyncio for async tests."
    
    # Mock Firestore nodes
    mock_node = {"label": "Pytest", "description": "Testing framework"}
    
    # Mock Ollama AsyncClient chat
    mock_response = MockChatResponse("This is the mock response from GLM.")
    
    with patch("app.routers.search._run_semantic_search", new_callable=AsyncMock) as mock_search, \
         patch("app.firestore.FirestoreStore.list_knowledge_nodes", return_value=[mock_node]) as mock_nodes, \
         patch("ollama.AsyncClient.chat", new_callable=AsyncMock) as mock_ollama_chat:
        
        mock_search.return_value = [mock_hit]
        mock_ollama_chat.return_value = mock_response
        
        response = await _get_ollama_chat_response(
            user_id="test-user",
            messages=messages,
            model="glm-5.2:cloud"
        )
        
        assert response == "This is the mock response from GLM."
        mock_search.assert_called_once_with(query="How to write a pytest?", user_id="test-user", limit=5)
        mock_ollama_chat.assert_called_once()
        
        # Check that context and system prompt was built
        called_kwargs = mock_ollama_chat.call_args[1]
        assert called_kwargs["model"] == "glm-5.2:cloud"
        assert called_kwargs["stream"] is False
        assert any("Use @pytest.mark.asyncio" in m["content"] for m in called_kwargs["messages"])


@pytest.mark.asyncio
async def test_stream_ollama_chat():
    messages = [
        {"role": "user", "content": "Hello GLM"}
    ]
    
    # Mock Ollama AsyncClient streaming response
    mock_chunks = [
        MockChatResponse("Hello"),
        MockChatResponse(" standard"),
        MockChatResponse(" world!")
    ]
    
    async def mock_generator(*args, **kwargs):
        for chunk in mock_chunks:
            yield chunk

    with patch("app.routers.search._run_semantic_search", new_callable=AsyncMock) as mock_search, \
         patch("app.firestore.FirestoreStore.list_knowledge_nodes", return_value=[]) as mock_nodes, \
         patch("ollama.AsyncClient.chat", return_value=mock_generator()) as mock_ollama_chat:
        
        mock_search.return_value = []
        
        yielded = []
        async for chunk in _stream_ollama_chat(
            user_id="test-user",
            messages=messages,
            model="glm-5.2:cloud"
        ):
            yielded.append(chunk)
            
        assert yielded == ["Hello", " standard", " world!"]
