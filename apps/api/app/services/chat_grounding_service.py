from __future__ import annotations

import logging
from typing import Any

from app.neo4j_client import Neo4jKnowledgeStore
from app.services.vector_search_service import get_search_backend, SearchBackend
from app.services.embedding_service import EmbeddingService, EmbeddingChunk

logger = logging.getLogger(__name__)


class ChatGroundingService:
    """Service to inject real RAG context into chat models."""
    
    def __init__(self, neo4j_store: Neo4jKnowledgeStore | None = None, search_backend: SearchBackend | None = None, embedding_service: EmbeddingService | None = None) -> None:
        self.neo4j_store = neo4j_store or Neo4jKnowledgeStore()
        self.search_backend = search_backend or get_search_backend()
        self.embedding_service = embedding_service or EmbeddingService()

    async def build_grounded_context(
        self, *, user_id: str, query: str, max_nodes: int = 8,
        max_conversation_snippets: int = 5,
        provider_slugs: list[str] | None = None,
    ) -> str:
        """Builds a string of context from the knowledge graph and past conversations."""
        try:
            # 1. Semantic search against past conversations
            query_vector = await self._get_query_vector(query)
            snippets_text = ""
            
            if query_vector:
                hits = self.search_backend.search(
                    query_vector=query_vector,
                    user_id=user_id,
                    provider_slugs=provider_slugs,
                    limit=max_conversation_snippets
                )
                if hits:
                    snippets = []
                    found_slugs = set()
                    for hit in hits:
                        # Optionally format date if hit.created_at is present
                        date_str = hit.created_at.strftime("%Y-%m-%d") if hit.created_at else "Past message"
                        snippets.append(f"- ({date_str}) \"{hit.chunk_text}\"")
                        if hit.provider_slug:
                            found_slugs.add(hit.provider_slug)
                    snippets_text = "RELEVANT PAST MESSAGES:\n" + "\n".join(snippets) + "\n"
                    if found_slugs:
                        snippets_text += f"CITATIONS: {', '.join(found_slugs)}\n"

            # 2. Query Neo4j for top relevant nodes and their immediate relationships
            # For simplicity without a dedicated semantic graph index, we fetch the most occurring
            # nodes or nodes that loosely match the query text.
            # To keep it bounded and relevant, we pull top nodes and then filter by query match.
            all_nodes = self.neo4j_store.list_nodes(user_id=user_id, limit=max_nodes * 5)
            # Neo4j nodes don't easily map to provider slugs unless we fetch source conversations, 
            # so we'll just filter them conceptually or skip filtering if we can't.
            query_lower = query.lower()
            
            # Simple keyword overlap scoring
            scored_nodes = []
            for node in all_nodes:
                label = (node.get("label") or "").lower()
                desc = (node.get("description") or "").lower()
                # Basic relevance: if node label is in query or query is in node label
                if label in query_lower or any(word in label for word in query_lower.split() if len(word) > 4):
                    scored_nodes.append(node)
                elif desc and any(word in desc for word in query_lower.split() if len(word) > 4):
                    scored_nodes.append(node)
            
            # Fallback to most frequent nodes if we don't find explicit keyword matches
            if not scored_nodes:
                scored_nodes = all_nodes[:max_nodes]
            else:
                scored_nodes = scored_nodes[:max_nodes]

            graph_text = ""
            if scored_nodes:
                graph_lines = []
                for node in scored_nodes:
                    node_id = node.get("id")
                    label = node.get("label", "Unknown")
                    desc = f": {node['description']}" if node.get("description") else ""
                    
                    # Pull immediate relationships
                    if node_id:
                        related_nodes = self.neo4j_store.find_related(node_id, user_id, depth=1)
                        if related_nodes:
                            rel_labels = [r.get("label", "") for r in related_nodes[:3]]
                            rel_str = f" [Connected to: {', '.join(rel_labels)}]" if rel_labels else ""
                            graph_lines.append(f"- [Node: \"{label}\"]{desc}{rel_str}")
                        else:
                            graph_lines.append(f"- [Node: \"{label}\"]{desc}")
                
                if graph_lines:
                    graph_text = "RELEVANT KNOWLEDGE FROM YOUR PAST CONVERSATIONS:\n" + "\n".join(graph_lines) + "\n"

            # 3. Assemble and return context block
            combined = []
            if graph_text:
                combined.append(graph_text)
            if snippets_text:
                combined.append(snippets_text)

            if not combined:
                return ""
                
            return "\n".join(combined).strip()
            
        except Exception as e:
            logger.error(f"Error building grounded context: {e}")
            return ""

    async def _get_query_vector(self, query: str) -> list[float]:
        try:
            dummy_chunk = EmbeddingChunk(
                conversation_id="temp",
                message_id="temp",
                chunk_index=0,
                text=query,
                token_count=len(query.split())
            )
            res = await self.embedding_service.embed_chunks([dummy_chunk])
            if res.vectors and len(res.vectors) > 0:
                return res.vectors[0]
            return []
        except Exception:
            return []
