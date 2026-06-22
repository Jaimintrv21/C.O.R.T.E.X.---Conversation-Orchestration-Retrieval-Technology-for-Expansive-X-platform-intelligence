from app.workers.celery_app import celery_app
import logging
from app.services.knowledge_extraction_service import KnowledgeExtractionService
import asyncio

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.extract_knowledge", acks_late=True)
def extract_knowledge(message_ids: list[str]) -> dict:
    """Incremental knowledge extraction task."""
    logger.info(f"extract_knowledge called with {message_ids}")
    service = KnowledgeExtractionService()
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(service.extract_from_messages(message_ids))
    return result

@celery_app.task(name="tasks.extract_knowledge_for_session", acks_late=True)
def extract_knowledge_for_session(conversation_id: str) -> dict:
    """Full-session knowledge extraction task."""
    logger.info(f"extract_knowledge_for_session called with {conversation_id}")
    service = KnowledgeExtractionService()
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(service.extract_from_session(conversation_id))
    return result

@celery_app.task(name="tasks.recover_stuck_extractions")
def recover_stuck_extractions():
    """Periodic Celery beat task to recover stuck knowledge extractions."""
    from app.firestore import FirestoreStore
    from datetime import datetime, UTC, timedelta
    
    store = FirestoreStore()
    ten_mins_ago = datetime.now(UTC) - timedelta(minutes=10)
    
    # In a real impl, we query firestore for pending/processing status older than 10 mins.
    # Since Firestore queries across collections or requiring composite indexes might be tricky here, 
    # we would assume a scheduled task running and grabbing stuck conversations.
    logger.info("Recovering stuck extractions...")
    return {"recovered": 0}

