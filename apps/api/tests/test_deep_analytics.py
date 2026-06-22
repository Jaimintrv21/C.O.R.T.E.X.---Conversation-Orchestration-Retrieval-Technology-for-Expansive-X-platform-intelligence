import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from datetime import date
from app.main import app

from app.dependencies import get_current_user

client = TestClient(app)

def override_get_current_user():
    return {"id": "test-user"}

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture(autouse=True)
def cleanup():
    yield
    # No need to cleanup since we are just mocking the auth globally for this test file

    
def test_analytics_sentiment_trend():
    response = client.get("/api/v1/analytics/sentiment-trend?date_from=2023-01-01")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) > 0
    assert "sentiment_score" in data[0]
    
def test_analytics_response_quality():
    response = client.get("/api/v1/analytics/response-quality")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) > 0
    assert data[0]["clarification_rate"] is not None

def test_analytics_topic_evolution():
    response = client.get("/api/v1/analytics/topic-evolution")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) > 0
    assert data[0]["trend"] in ["growing", "shrinking", "stable"]

def test_analytics_cross_provider_comparison():
    response = client.get("/api/v1/analytics/cross-provider-comparison")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) > 0
    assert "comparisons" in data[0]

def test_analytics_knowledge_graph_stats():
    response = client.get("/api/v1/analytics/knowledge-graph-stats")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "node_count" in data
    assert "edge_count" in data
