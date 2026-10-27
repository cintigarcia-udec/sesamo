import pytest
from app.models.user import User, TypeDocumentIdentity
from app.utilities.jwt import create_access_token, verify_token

def test_password_hashing_and_verification():
    user = User(
        name="Test",
        email="hash@test.com",
        type_document_identity=TypeDocumentIdentity.CC,
        document_identity="999",
    )
    user.set_password("MiClaveSegura123")
    
    assert user.password is not None
    assert user.password != "MiClaveSegura123"
    assert user.check_password("MiClaveSegura123") is True
    assert user.check_password("ClaveErrada") is False

def test_jwt_token_generation_and_payload():
    payload_data = {
        "sub": "user@example.com",
        "id": 42,
        "role_id": 1,
    }
    token = create_access_token(data=payload_data)
    decoded = verify_token(token)
    
    assert decoded["sub"] == "user@example.com"
    assert decoded["id"] == 42
    assert decoded["role_id"] == 1
    assert "exp" in decoded

def test_login_success_admin(client):
    response = client.post(
        "/auth/login",
        json={"email": "admin@test.com", "password": "AdminPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    # Check token payload
    decoded = verify_token(data["access_token"])
    assert decoded["sub"] == "admin@test.com"
    assert decoded["role_id"] == 1

def test_login_success_student(client):
    response = client.post(
        "/auth/login",
        json={"email": "student@test.com", "password": "StudentPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    
    decoded = verify_token(data["access_token"])
    assert decoded["sub"] == "student@test.com"
    assert decoded["role_id"] == 2

def test_login_wrong_password(client):
    response = client.post(
        "/auth/login",
        json={"email": "admin@test.com", "password": "ClaveIncorrecta"},
    )
    assert response.status_code == 401
    assert "Credenciales inválidas" in response.json()["detail"]

def test_login_nonexistent_email(client):
    response = client.post(
        "/auth/login",
        json={"email": "desconocido@test.com", "password": "Cualquiera123"},
    )
    assert response.status_code == 401

def test_register_student(client):
    payload = {
        "name": "Nuevo",
        "last_name": "Estudiante",
        "email": "nuevo_alumno@test.com",
        "type_document_identity": "cc",
        "document_identity": "777888",
        "password": "Password123!",
        "school_id": 1,
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "nuevo_alumno@test.com"
    assert data["name"] == "Nuevo"
    assert data["id"] is not None

def test_register_duplicate_email(client):
    payload = {
        "name": "Duplicado",
        "last_name": "Usuario",
        "email": "admin@test.com",  # Ya existe
        "type_document_identity": "cc",
        "document_identity": "111111",
        "password": "Password123!",
        "school_id": 1,
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 400
    assert "El email ya está en uso" in response.json()["detail"]
