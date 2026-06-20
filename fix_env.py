import os

with open('.env.example', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('C.O.R.T.E.X._DATABASE_BACKEND=firebase\n', '')
content = content.replace('C.O.R.T.E.X._DATABASE_URL=postgresql+asyncpg://cortex:cortex@localhost:5432/cortex', '# Neo4j\nC.O.R.T.E.X._NEO4J_URI=bolt://localhost:7687\nC.O.R.T.E.X._NEO4J_USERNAME=neo4j\nC.O.R.T.E.X._NEO4J_PASSWORD=password')
content = content.replace('C.O.R.T.E.X._DATABASE_POOL_SIZE=20', 'C.O.R.T.E.X._NEO4J_DATABASE=neo4j')
content = content.replace('# Database (PostgreSQL 16 + pgvector)', '')

with open('.env.example', 'w', encoding='utf-8') as f:
    f.write(content)
