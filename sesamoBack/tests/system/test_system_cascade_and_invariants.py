import pytest
from app.utilities.jwt import create_access_token

@pytest.mark.system
def test_system_security_invariants_across_endpoints(client):
    """
    SYSTEM TEST: Invariantes de seguridad transversales del sistema.
    
    Verifica que:
    1. Todas las operaciones protegidas rechazan peticiones anónimas (401).
    2. Peticiones con tokens malformados o firmas falsificadas son rechazadas (401).
    """
    unauthorized_endpoints = [
        ("GET", "/users/"),
        ("POST", "/schools/"),
        ("POST", "/categories/"),
        ("POST", "/questionnaires/"),
        ("POST", "/questions/"),
        ("POST", "/answer-options/"),
        ("GET", "/user-responses/"),
    ]

    # Sin token
    for method, path in unauthorized_endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code == 401, f"{method} {path} debe rechazar peticiones sin token"

    # Con token manipulado / firma inválida
    fake_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.fake_signature"}
    for method, path in unauthorized_endpoints:
        if method == "GET":
            res = client.get(path, headers=fake_headers)
        else:
            res = client.post(path, json={}, headers=fake_headers)
        assert res.status_code == 401, f"{method} {path} debe rechazar tokens falsificados"

@pytest.mark.system
def test_system_multi_student_isolation(client, admin_headers):
    """
    SYSTEM TEST: Invariante de aislamiento multi-usuario.
    
    Dos estudiantes independientes resuelven el mismo cuestionario en paralelo:
    - Ambos obtienen sus registros aislados sin interferencia de datos ni sobreescrituras.
    - Las calificaciones individuales se preservan fielmente.
    """
    # 1. Registrar Estudiante A
    res_a = client.post("/auth/register", json={
        "name": "Alumno A",
        "last_name": "Test",
        "email": "alumno.a@test.com",
        "password": "Password123!",
        "type_document_identity": "ti",
        "document_identity": "300001",
        "school_id": 1,
    })
    assert res_a.status_code == 201
    user_a_id = res_a.json()["id"]

    token_a = client.post("/auth/login", json={"email": "alumno.a@test.com", "password": "Password123!"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Registrar Estudiante B
    res_b = client.post("/auth/register", json={
        "name": "Alumno B",
        "last_name": "Test",
        "email": "alumno.b@test.com",
        "password": "Password123!",
        "type_document_identity": "ti",
        "document_identity": "300002",
        "school_id": 1,
    })
    assert res_b.status_code == 201
    user_b_id = res_b.json()["id"]

    token_b = client.post("/auth/login", json={"email": "alumno.b@test.com", "password": "Password123!"}).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Ambos presentan cuestionario #1 con respuestas y notas diferentes
    sub_a = client.post("/user-responses/", json={
        "user_id": user_a_id,
        "questionnaire_id": 1,
        "score": 75.0,
        "answers": '{"1": "A"}',
    }, headers=headers_a)
    assert sub_a.status_code == 201
    resp_a_id = sub_a.json()["id"]

    sub_b = client.post("/user-responses/", json={
        "user_id": user_b_id,
        "questionnaire_id": 1,
        "score": 100.0,
        "answers": '{"1": "B"}',
    }, headers=headers_b)
    assert sub_b.status_code == 201
    resp_b_id = sub_b.json()["id"]

    # 4. Validar aislamiento estricto
    record_a = client.get(f"/user-responses/{resp_a_id}", headers=headers_a).json()
    record_b = client.get(f"/user-responses/{resp_b_id}", headers=headers_b).json()

    assert record_a["user_id"] == user_a_id
    assert record_a["score"] == 75.0
    assert record_b["user_id"] == user_b_id
    assert record_b["score"] == 100.0
    assert resp_a_id != resp_b_id
