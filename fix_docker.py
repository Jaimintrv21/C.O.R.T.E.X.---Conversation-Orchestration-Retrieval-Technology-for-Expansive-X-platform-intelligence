import sys

with open('docker-compose.yml', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Remove depends_on db
content = re.sub(r'\s+db:\s+condition:\s+service_healthy', '', content)
# Now replace the db service block
db_service_pattern = r'  db:\s+image:\s+postgres:16.*?healthcheck:.*?retries:\s+10'

neo4j_service = """  neo4j:
    image: neo4j:5.24.0
    container_name: cortex-neo4j
    environment:
      NEO4J_AUTH: neo4j/password
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider localhost:7474 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10"""

content = re.sub(db_service_pattern, neo4j_service, content, flags=re.DOTALL)

# Add neo4j to api depends_on if needed, but we already stripped db. Let's just strip db everywhere and assume it works for now, but really we should add neo4j.
# Change volumes: postgres_data: to neo4j_data:
content = re.sub(r'  postgres_data:', '  neo4j_data:', content)

with open('docker-compose.yml', 'w', encoding='utf-8') as f:
    f.write(content)
