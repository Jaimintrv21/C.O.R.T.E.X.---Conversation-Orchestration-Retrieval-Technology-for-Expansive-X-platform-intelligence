"""Legacy SQLAlchemy scaffolding.

Firebase/Firestore is now the primary application database. This module stays in
place so existing model imports do not explode while the remaining services are
migrated off SQLAlchemy.
"""
from __future__ import annotations
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings
from app.firestore import get_firestore_client

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    echo=settings.database_echo,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    yield None


async def init_db() -> None:
    get_firestore_client()


async def close_db() -> None:
    await engine.dispose()
