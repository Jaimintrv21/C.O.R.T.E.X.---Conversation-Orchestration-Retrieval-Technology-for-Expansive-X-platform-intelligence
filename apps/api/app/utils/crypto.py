"""AES-256-GCM encryption and Argon2id hashing."""
from __future__ import annotations
import os
from argon2 import PasswordHasher
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import get_settings

ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
)


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return ph.verify(hashed, password)
    except Exception:
        return False


def needs_rehash(hashed: str) -> bool:
    return ph.check_needs_rehash(hashed)


# ── AES-256-GCM ─────────────────────────────────────────────────────────

def _get_master_key() -> bytes:
    key = get_settings().master_encryption_key.encode()
    if len(key) < 32:
        key = key.ljust(32, b"\0")
    return key[:32]


def encrypt_field(plaintext: bytes) -> tuple[bytes, bytes]:
    """Returns (ciphertext, iv/nonce)."""
    key = _get_master_key()
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return ciphertext, nonce


def decrypt_field(ciphertext: bytes, nonce: bytes) -> bytes:
    key = _get_master_key()
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)
