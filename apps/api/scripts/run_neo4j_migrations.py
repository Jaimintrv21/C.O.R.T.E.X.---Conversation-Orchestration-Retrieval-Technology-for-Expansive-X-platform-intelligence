import os
import glob
import logging
from neo4j import GraphDatabase
from app.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    settings = get_settings()
    
    # Initialize driver
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password),
    )
    
    # Ensure migration tracker exists
    with driver.session() as session:
        session.run("CREATE CONSTRAINT migration_filename_unique IF NOT EXISTS FOR (m:_Migration) REQUIRE m.filename IS UNIQUE")
    
    migration_dir = os.path.join(os.path.dirname(__file__), "neo4j_migrations")
    cypher_files = sorted(glob.glob(os.path.join(migration_dir, "*.cypher")))
    
    for file_path in cypher_files:
        filename = os.path.basename(file_path)
        
        # Check if already run
        with driver.session() as session:
            result = session.run("MATCH (m:_Migration {filename: $filename}) RETURN m", filename=filename)
            if result.peek():
                logger.info(f"Migration {filename} already executed. Skipping.")
                continue
        
        logger.info(f"Running migration: {filename}")
        with open(file_path, "r", encoding="utf-8") as f:
            cypher_queries = f.read().split(";")
            
        with driver.session() as session:
            for query in cypher_queries:
                query = query.strip()
                if not query:
                    continue
                try:
                    session.run(query)
                except Exception as e:
                    logger.error(f"Failed to execute query in {filename}: {e}")
                    raise e
            
            # Record migration success
            session.run("MERGE (m:_Migration {filename: $filename}) SET m.executed_at = timestamp()", filename=filename)
            logger.info(f"Successfully recorded migration {filename}")
            
    driver.close()

if __name__ == "__main__":
    run_migrations()
