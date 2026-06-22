import asyncio
import pytest
from app.firestore import FirestoreStore
from unittest.mock import patch, MagicMock

class MockFirestoreStore(FirestoreStore):
    def __init__(self):
        self.users = {}
    
    def _col(self, name):
        col_mock = MagicMock()
        def doc_mock(id):
            dm = MagicMock()
            dm.get.return_value.exists = id in self.users
            dm.get.return_value.to_dict.return_value = self.users.get(id)
            dm.id = id
            def set_mock(payload, merge=False):
                if merge:
                    self.users[id] = {**self.users.get(id, {}), **payload}
                else:
                    self.users[id] = payload
            dm.set.side_effect = set_mock
            return dm
        col_mock.document.side_effect = doc_mock
        return col_mock
        
    @property
    def db(self):
        db_mock = MagicMock()
        def tx_mock():
            tm = MagicMock()
            def set_tx(ref, payload, merge=False):
                ref.set(payload, merge=merge)
            tm.set.side_effect = set_tx
            return tm
        db_mock.transaction.return_value = tx_mock()
        return db_mock
        
    def get_user(self, user_id):
        return self.users.get(user_id)

@pytest.fixture
def store():
    # Because we use firestore.transactional decorator which needs google.cloud.firestore,
    # we patch the transaction decorator to just call the function directly.
    import google.cloud.firestore as firestore
    def mock_transactional(func):
        return func
    with patch('google.cloud.firestore.transactional', mock_transactional):
        yield MockFirestoreStore()

@pytest.mark.asyncio
async def test_auth_chain_google(store):
    sub = "google-oauth2|123456789"
    claims = {
        "sub": sub,
        "email": "test.google@example.com",
        "name": "Google Test User",
        "picture": "https://google.com/avatar.jpg",
        "email_verified": True,
        "iss": "https://accounts.google.com",
        "aud": "my-client-id",
    }
    
    user = store.get_or_create_user_from_auth0(sub, claims)
    
    assert user["id"] == sub
    assert user["email"] == "test.google@example.com"
    assert user["display_name"] == "Google Test User"
    assert user["auth0_connection"] == "https://accounts.google.com"

@pytest.mark.asyncio
async def test_auth_chain_github(store):
    sub = "github|987654321"
    claims = {
        "sub": sub,
        "email": "test.github@example.com",
        "nickname": "githubtester",
        "picture": "https://github.com/avatar.jpg",
        "email_verified": True,
        "iss": "https://auth0.com/",
        "aud": "my-client-id",
        "gty": "github",
    }
    
    user = store.get_or_create_user_from_auth0(sub, claims)
    
    assert user["id"] == sub
    assert user["email"] == "test.github@example.com"
    assert user["display_name"] == "githubtester"
    assert user["auth0_connection"] == "github"

@pytest.mark.asyncio
async def test_auth_chain_race_condition(store):
    sub = "race-test|00000"
    claims = {
        "sub": sub,
        "email": "race@example.com",
        "name": "Race Tester",
    }

    # Run get_or_create concurrently to simulate a race condition.
    # The transaction should handle this gracefully without throwing
    # exceptions or creating multiple conflicting documents.
    
    def fetch_user():
        return store.get_or_create_user_from_auth0(sub, claims)
        
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(fetch_user) for _ in range(5)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
    # All should return the same user ID
    for res in results:
        assert res["id"] == sub
        
    # Verify the user exists exactly once
    final_user = store.get_user(sub)
    assert final_user is not None
    assert final_user["id"] == sub
