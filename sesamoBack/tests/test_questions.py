def test_create_question_as_admin_success(client, admin_headers):
    payload = {
        "question_text": "¿Cuál es la velocidad de la luz?",
        "questionnaire_id": 1,
    }
    response = client.post("/questions/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["question_text"] == "¿Cuál es la velocidad de la luz?"
    assert data["questionnaire_id"] == 1
    assert data["id"] is not None

def test_create_question_as_student_forbidden(client, student_headers):
    payload = {
        "question_text": "Intento de pregunta por estudiante",
        "questionnaire_id": 1,
    }
    response = client.post("/questions/", json=payload, headers=student_headers)
    assert response.status_code == 403
    assert "Solo Administradores" in response.json()["detail"]

def test_create_question_unauthenticated(client):
    payload = {
        "question_text": "Sin auth",
        "questionnaire_id": 1,
    }
    response = client.post("/questions/", json=payload)
    assert response.status_code == 401

def test_create_question_invalid_questionnaire(client, admin_headers):
    payload = {
        "question_text": "Pregunta huérfana",
        "questionnaire_id": 99999,  # No existe
    }
    response = client.post("/questions/", json=payload, headers=admin_headers)
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "cuestionario especificado no existe" in detail or "Error de integridad" in detail

def test_read_questions_list(client, student_headers):
    response = client.get("/questions/", headers=student_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["question_text"] == "¿Cuánto es 2 + 2?"

def test_read_question_by_id(client, student_headers):
    response = client.get("/questions/1", headers=student_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["question_text"] == "¿Cuánto es 2 + 2?"

def test_read_question_not_found(client, student_headers):
    response = client.get("/questions/99999", headers=student_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Question not found"

def test_update_question_as_admin(client, admin_headers):
    payload = {"question_text": "¿Cuánto es 2 + 2 corregido?"}
    response = client.patch("/questions/1", json=payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["question_text"] == "¿Cuánto es 2 + 2 corregido?"

def test_update_question_as_student_forbidden(client, student_headers):
    payload = {"question_text": "¿Modificación no permitida?"}
    response = client.patch("/questions/1", json=payload, headers=student_headers)
    assert response.status_code == 403

def test_delete_question_as_admin(client, admin_headers):
    # Crear primero una pregunta independiente sin opciones asociadas
    create_res = client.post(
        "/questions/",
        json={"question_text": "Pregunta a eliminar", "questionnaire_id": 1},
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    question_id = create_res.json()["id"]

    # Eliminarla
    response = client.delete(f"/questions/{question_id}", headers=admin_headers)
    assert response.status_code == 204

    # Verificar que ya no existe
    get_res = client.get(f"/questions/{question_id}", headers=admin_headers)
    assert get_res.status_code == 404

def test_delete_question_as_student_forbidden(client, student_headers):
    response = client.delete("/questions/1", headers=student_headers)
    assert response.status_code == 403
