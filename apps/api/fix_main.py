import sys

with open('app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('if settings.environment == "development":\n        await init_db()', 'get_firestore_client()')
content = content.replace('await close_db()', 'pass')

with open('app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
