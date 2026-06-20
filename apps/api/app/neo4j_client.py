"""Neo4j client and Knowledge Store."""
from __future__ import annotations

from functools import lru_cache
from typing import Any

from neo4j import GraphDatabase, Driver

from app.config import get_settings
import uuid

def make_uuid() -> str:
    return str(uuid.uuid4())

@lru_cache
def get_neo4j_driver() -> Driver:
    settings = get_settings()
    return GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password),
    )

class Neo4jKnowledgeStore:
    """Repository-style facade around Neo4j for the knowledge graph."""

    def __init__(self) -> None:
        self.driver = get_neo4j_driver()

    def upsert_node(
        self, *, user_id: str, workspace_id: str | None, label: str,
        node_type: str, description: str | None = None,
        source_ids: list[str] | None = None,
        metadata: dict | None = None,
    ) -> dict:
        query = """
        MERGE (n:KnowledgeNode {user_id: $user_id, label_normalized: $label_normalized})
        ON CREATE SET n.id = $id,
                      n.label = $label,
                      n.node_type = $node_type,
                      n.description = $description,
                      n.source_ids = $source_ids,
                      n.occurrence_count = 1,
                      n.workspace_id = $workspace_id
        ON MATCH SET n.occurrence_count = n.occurrence_count + 1,
                     n.source_ids = apoc.coll.toSet(n.source_ids + $source_ids)
        WITH n
        CALL apoc.do.when($description IS NOT NULL AND n.description IS NULL,
            'SET n.description = $desc RETURN n',
            'RETURN n',
            {n: n, desc: $description}) YIELD value
        RETURN value.n AS node
        """
        # wait, apoc is not guaranteed. Let's write standard cypher
        query = """
        MERGE (n:KnowledgeNode {user_id: $user_id, label_normalized: $label_normalized})
        ON CREATE SET n.id = $id,
                      n.label = $label,
                      n.node_type = $node_type,
                      n.description = $description,
                      n.occurrence_count = 1,
                      n.workspace_id = $workspace_id
        ON MATCH SET n.occurrence_count = coalesce(n.occurrence_count, 1) + 1
        
        // We can't do conditional SET easily in pure cypher for description, so let's do it in python
        RETURN n
        """
        
        label_normalized = label.strip().lower()
        node_id = make_uuid()
        
        with self.driver.session() as session:
            result = session.run(query, 
                                 user_id=user_id, 
                                 label_normalized=label_normalized,
                                 id=node_id,
                                 label=label,
                                 node_type=node_type,
                                 description=description,
                                 workspace_id=workspace_id)
            record = result.single()
            node = dict(record["n"])
            
            # Update description if it was null and we have a new one
            if description and not node.get("description"):
                session.run("MATCH (n:KnowledgeNode {id: $id}) SET n.description = $desc", 
                            id=node["id"], desc=description)
                node["description"] = description
            
            # Merge source_ids
            existing_sources = node.get("source_ids", [])
            new_sources = list(set(existing_sources + (source_ids or [])))
            session.run("MATCH (n:KnowledgeNode {id: $id}) SET n.source_ids = $sources", 
                        id=node["id"], sources=new_sources)
            node["source_ids"] = new_sources
            
            return node

    def create_edge(
        self, *, source_id: str, target_id: str, relationship: str,
        weight: float = 1.0, evidence: list | None = None,
        user_id: str, workspace_id: str | None = None,
    ) -> dict:
        query = """
        MATCH (a:KnowledgeNode {id: $source_id}), (b:KnowledgeNode {id: $target_id})
        WHERE a.user_id = $user_id AND b.user_id = $user_id
        MERGE (a)-[r:RELATES_TO {relationship: $relationship}]->(b)
        SET r.weight = coalesce(r.weight, 0) + $weight
        RETURN r
        """
        with self.driver.session() as session:
            result = session.run(query, source_id=source_id, target_id=target_id, 
                                 user_id=user_id, relationship=relationship, weight=weight)
            record = result.single()
            if not record:
                return {}
            
            rel = dict(record["r"])
            # Evidence update
            existing_evidence = rel.get("evidence", [])
            new_evidence = existing_evidence + (evidence or [])
            session.run("""
            MATCH (a:KnowledgeNode {id: $source_id})-[r:RELATES_TO {relationship: $relationship}]->(b:KnowledgeNode {id: $target_id})
            SET r.evidence = $evidence
            """, source_id=source_id, target_id=target_id, relationship=relationship, evidence=new_evidence)
            rel["evidence"] = new_evidence
            
            return {
                "source_id": source_id,
                "target_id": target_id,
                "relationship": relationship,
                "weight": rel.get("weight"),
                "evidence": new_evidence
            }

    def list_nodes(
        self, user_id: str, workspace_id: str | None = None,
        limit: int = 200,
    ) -> list[dict]:
        query = """
        MATCH (n:KnowledgeNode {user_id: $user_id})
        RETURN n
        ORDER BY n.occurrence_count DESC
        LIMIT $limit
        """
        with self.driver.session() as session:
            result = session.run(query, user_id=user_id, limit=limit)
            return [dict(record["n"]) for record in result]

    def list_edges(
        self, user_id: str, workspace_id: str | None = None,
        limit: int = 500,
    ) -> list[dict]:
        query = """
        MATCH (a:KnowledgeNode {user_id: $user_id})-[r:RELATES_TO]->(b:KnowledgeNode {user_id: $user_id})
        RETURN a.id AS source_id, b.id AS target_id, r.relationship AS relationship,
               r.weight AS weight, r.evidence AS evidence
        LIMIT $limit
        """
        with self.driver.session() as session:
            result = session.run(query, user_id=user_id, limit=limit)
            return [dict(record) for record in result]

    def find_related(
        self, node_id: str, user_id: str, depth: int = 2,
    ) -> list[dict]:
        query = """
        MATCH (start:KnowledgeNode {id: $node_id, user_id: $user_id})-[*1..$depth]-(related:KnowledgeNode)
        WHERE related.user_id = $user_id
        RETURN DISTINCT related
        """
        with self.driver.session() as session:
            result = session.run(query, node_id=node_id, user_id=user_id, depth=depth)
            return [dict(record["related"]) for record in result]

    def delete_user_graph(self, user_id: str) -> None:
        query = "MATCH (n:KnowledgeNode {user_id: $user_id}) DETACH DELETE n"
        with self.driver.session() as session:
            session.run(query, user_id=user_id)
