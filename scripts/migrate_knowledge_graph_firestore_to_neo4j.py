"""Migrate knowledge graph from Firestore to Neo4j."""
from __future__ import annotations

import logging
import os
import sys

# Add apps/api to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from app.firestore import FirestoreStore
from app.neo4j_client import Neo4jKnowledgeStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

def migrate():
    firestore_store = FirestoreStore()
    neo4j_store = Neo4jKnowledgeStore()

    logger.info("Starting knowledge graph migration from Firestore to Neo4j...")

    # Migrate nodes
    nodes_col = firestore_store._col("knowledge_nodes")
    nodes_docs = list(nodes_col.stream())
    logger.info(f"Found {len(nodes_docs)} nodes in Firestore knowledge_nodes collection.")

    migrated_nodes_count = 0
    for doc in nodes_docs:
        data = doc.to_dict()
        if not data:
            continue
        
        user_id = data.get("user_id")
        if not user_id:
            logger.warning(f"Node doc {doc.id} missing user_id. Skipping.")
            continue
            
        try:
            neo4j_store.upsert_node(
                user_id=user_id,
                workspace_id=data.get("workspace_id"),
                label=data.get("label", "Unknown"),
                node_type=data.get("node_type", "entity"),
                description=data.get("description"),
                source_ids=data.get("source_ids", []),
                metadata=data.get("metadata")
            )
            migrated_nodes_count += 1
        except Exception as e:
            logger.error(f"Failed to migrate node {doc.id}: {e}")

    logger.info(f"Migrated {migrated_nodes_count} nodes successfully.")

    # Migrate edges (Firestore does not have an edges collection, it seems. If it did, it would be knowledge_edges)
    edges_col = firestore_store._col("knowledge_edges")
    edges_docs = list(edges_col.stream())
    logger.info(f"Found {len(edges_docs)} edges in Firestore knowledge_edges collection.")

    migrated_edges_count = 0
    for doc in edges_docs:
        data = doc.to_dict()
        if not data:
            continue
        
        user_id = data.get("user_id")
        source_id = data.get("source_id")
        target_id = data.get("target_id")
        
        if not user_id or not source_id or not target_id:
            logger.warning(f"Edge doc {doc.id} missing user_id, source_id, or target_id. Skipping.")
            continue
            
        try:
            neo4j_store.create_edge(
                source_id=source_id,
                target_id=target_id,
                relationship=data.get("relationship", "RELATES_TO"),
                weight=data.get("weight", 1.0),
                evidence=data.get("evidence", []),
                user_id=user_id,
                workspace_id=data.get("workspace_id")
            )
            migrated_edges_count += 1
        except Exception as e:
            logger.error(f"Failed to migrate edge {doc.id}: {e}")

    logger.info(f"Migrated {migrated_edges_count} edges successfully.")
    logger.info("Knowledge graph migration completed.")

if __name__ == "__main__":
    migrate()
