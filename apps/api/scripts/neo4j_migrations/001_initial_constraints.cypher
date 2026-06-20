CREATE CONSTRAINT node_id_unique IF NOT EXISTS
FOR (n:KnowledgeNode) REQUIRE n.id IS UNIQUE;

CREATE INDEX node_user_id IF NOT EXISTS
FOR (n:KnowledgeNode) ON (n.user_id);

CREATE INDEX node_label_normalized IF NOT EXISTS
FOR (n:KnowledgeNode) ON (n.label_normalized);
