def test_create_answer_option_admin_success(client, admin_headers):
    payload = {
        "answer": "Respuesta E",
        "option_key": "E",
        "question_id": 1,
        "is_correct": False,
    }
    response = client.post("/answer-options/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["answer"] == "Respuesta E"
    assert data["option_key"] == "E"
    assert data["question_id"] == 1
    assert data["is_correct"] is False

def test_create_answer_option_student_forbidden(client, student_headers):
    payload = {
        "answer": "Respuesta ilegal",
        "option_key": "F",
        "question_id": 1,
        "is_correct": True,
    }
    response = client.post("/answer-options/", json=payload, headers=student_headers)
    assert response.status_code == 403
    assert "Solo Administradores" in response.json()["detail"]

def test_student_cannot_see_is_correct(client, student_headers):
    response = client.get("/answer-options/", headers=student_headers)
    assert response.status_code == 200
    options = response.json()
    assert len(options) >= 4
    for opt in options:
        assert "is_correct" not in opt or opt["is_correct"] is None

def test_admin_can_see_is_correct(client, admin_headers):
    response = client.get("/answer-options/", headers=admin_headers)
    assert response.status_code == 200
    options = response.json()
    assert len(options) >= 4
    # En las opciones creadas en el fixture, la opción B es correcta
    correct_opts = [o for o in options if o.get("is_correct") is True]
    assert len(correct_opts) >= 1
    assert correct_opts[0]["option_key"] == "B"

def test_create_option_invalid_question(client, admin_headers):
    payload = {
        "answer": "Opción huérfana",
        "option_key": "A",
        "question_id": 99999,  # No existe
        "is_correct": True,
    }
    response = client.post("/answer-options/", json=payload, headers=admin_headers)
    assert response.status_code == 400

def test_update_answer_option_admin(client, admin_headers):
    payload = {"answer": "Opción 4 modificada"}
    response = client.patch("/answer-options/2", json=payload, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["answer"] == "Opción 4 modificada"

def test_delete_answer_option_admin(client, admin_headers):
    response = client.delete("/answer-options/4", headers=admin_headers)
    assert response.status_code == 204
