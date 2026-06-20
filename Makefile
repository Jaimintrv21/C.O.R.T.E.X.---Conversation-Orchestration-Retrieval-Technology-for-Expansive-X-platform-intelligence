.PHONY: neo4j-migrate

neo4j-migrate:
	PYTHONPATH=apps/api python apps/api/scripts/run_neo4j_migrations.py
