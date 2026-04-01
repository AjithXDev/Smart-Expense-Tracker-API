from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_full_flow():
    
    res = client.post("/register", json={
        "username": "testusers",
        "password": "test123",
        "mail": "test@mail.com",
        "name": "Test User"
    })
    assert res.status_code == 200

   
    res = client.post("/login", json={
        "username": "testusers",
        "password": "test123"
    })
    assert res.status_code == 200

    data = res.json()
    token = data["access_token"]

    headers = {
        "Authorization": f"Bearer {token}"
    }

    
    res = client.post("/add-expense", json={
        "title": "Lunch",
        "category": "Food",
        "amount": 200,
        "date": "2026-03-20",
        "payment_method": "cash"
    }, headers=headers)

    assert res.status_code == 200

    
    res = client.get("/expenses", headers=headers)
    assert res.status_code == 200
    assert "data" in res.json()

    expense_id = res.json()["data"][0]["id"]

   
    res = client.put(f"/update/{expense_id}", json={
        "title": "Dinner",
        "category": "Food",
        "amount": 300,
        "date": "2026-03-20",
        "payment_method": "card"
    }, headers=headers)

    assert res.status_code == 200

    
    res = client.get("/total_expense", headers=headers)
    assert res.status_code == 200
    assert "Total Expenses" in res.json()

   
    res = client.get("/category_expense", headers=headers)
    assert res.status_code == 200

    
    res = client.get("/daily_expense/2026-03-20", headers=headers)
    assert res.status_code == 200

    res = client.get("/monthly_expense/2026-03-01/2026-03-31", headers=headers)
    assert res.status_code == 200

   
    res = client.delete(f"/delete/{expense_id}", headers=headers)
    assert res.status_code == 200


def test_invalid_login():
    res = client.post("/login", json={
        "username": "wrong",
        "password": "wrong"
    })
    assert res.status_code == 401


def test_no_token_access():
    res = client.get("/expenses")
    assert res.status_code == 403  