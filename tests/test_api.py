from fastapi.testclient import TestClient
from src.app import app


client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # ensure a known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_cycle():
    activity = "Chess Club"
    email = "test_user@example.com"

    # Ensure email not already present
    resp = client.get("/activities")
    participants = resp.json()[activity]["participants"]
    if email in participants:
        # remove if present to ensure clean start
        client.delete(f"/activities/{activity}/participants?email={email}")

    # Sign up
    signup = client.post(f"/activities/{activity}/signup?email={email}")
    assert signup.status_code == 200
    assert "Signed up" in signup.json().get("message", "")

    # Verify presence
    resp = client.get("/activities")
    participants = resp.json()[activity]["participants"]
    assert email in participants

    # Unregister
    unreg = client.delete(f"/activities/{activity}/participants?email={email}")
    assert unreg.status_code == 200
    assert "Unregistered" in unreg.json().get("message", "")

    # Verify removal
    resp = client.get("/activities")
    participants = resp.json()[activity]["participants"]
    assert email not in participants
