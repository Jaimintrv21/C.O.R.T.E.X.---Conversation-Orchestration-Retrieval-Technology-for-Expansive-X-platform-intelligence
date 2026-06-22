import pytest
from app.services.chat_grounding_service import ChatGroundingService
from app.services.vector_search_service import VectorSearchHit

class MockNeo4jStore:
    def list_nodes(self, user_id, limit):
        return [
            {"id": "n1", "label": "Project X deadline", "description": "Needs to be done by Friday"},
            {"id": "n2", "label": "Q3 roadmap", "description": "Important document"}
        ]
        
    def find_related(self, node_id, user_id, depth):
        if node_id == "n1":
            return [{"id": "n2", "label": "Q3 roadmap"}]
        return []

class MockSearchBackend:
    def search(self, query_vector, user_id, limit):
        if not query_vector:
            return []
        import datetime
        return [
            VectorSearchHit(
                conversation_id="c1",
                message_id="m1",
                chunk_text="I need to finish Project X.",
                similarity=0.9,
                created_at=datetime.datetime(2023, 1, 1)
            )
        ]

class MockEmbeddingService:
    class MockResult:
        vectors = [[0.1, 0.2, 0.3]]
    async def embed_chunks(self, chunks):
        return self.MockResult()

@pytest.mark.asyncio
async def test_build_grounded_context():
    service = ChatGroundingService(
        neo4j_store=MockNeo4jStore(),
        search_backend=MockSearchBackend(),
        embedding_service=MockEmbeddingService()
    )
    
    context = await service.build_grounded_context(user_id="u1", query="What is Project X about?")
    
    assert "RELEVANT KNOWLEDGE FROM YOUR PAST CONVERSATIONS:" in context
    assert "Project X deadline" in context
    assert "Q3 roadmap" in context
    assert "RELEVANT PAST MESSAGES:" in context
    assert "I need to finish Project X." in context

@pytest.mark.asyncio
async def test_build_grounded_context_empty():
    class EmptySearchBackend:
        def search(self, query_vector, user_id, limit): return []
    class EmptyNeo4jStore:
        def list_nodes(self, user_id, limit): return []
        
    service = ChatGroundingService(
        neo4j_store=EmptyNeo4jStore(),
        search_backend=EmptySearchBackend(),
        embedding_service=MockEmbeddingService()
    )
    
    context = await service.build_grounded_context(user_id="u1", query="New user hello")
    assert context == ""
