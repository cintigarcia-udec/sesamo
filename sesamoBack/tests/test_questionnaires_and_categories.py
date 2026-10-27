def test_create_category_admin_success(client, admin_headers):
    payload = {"name": "Historia"}
    response = client.post("/categories/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Historia"
    assert data["id"] is not None

def test_create_category_student_forbidden(client, student_headers):
    payload = {"name": "Filosofía"}
    response = client.post("/categories/", json=payload, headers=student_headers)
    assert response.status_code == 403

def test_list_categories(client, student_headers):
    response = client.get("/categories/", headers=student_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(c["name"] == "Matemáticas" for c in data)

def test_update_category_admin(client, admin_headers):
    payload = {"name": "Matemáticas Avanzadas"}
    response = client.patch("/categories/1", json=payload, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Matemáticas Avanzadas"

def test_delete_category_admin(client, admin_headers):
    # Crear categoría sin dependencias para borrarla
    create_res = client.post("/categories/", json={"name": "Temporal"}, headers=admin_headers)
    cat_id = create_res.json()["id"]

    response = client.delete(f"/categories/{cat_id}", headers=admin_headers)
    assert response.status_code == 204

def test_create_questionnaire_admin_success(client, admin_headers):
    payload = {
        "questionnaire_number": 2,
        "category_id": 1,
    }
    response = client.post("/questionnaires/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["questionnaire_number"] == 2
    assert data["category_id"] == 1

def test_create_questionnaire_student_forbidden(client, student_headers):
    payload = {
        "questionnaire_number": 3,
        "category_id": 1,
    }
    response = client.post("/questionnaires/", json=payload, headers=student_headers)
    assert response.status_code == 403

def test_create_questionnaire_invalid_category(client, admin_headers):
    payload = {
        "questionnaire_number": 9,
        "category_id": 99999,  # No existe
    }
    response = client.post("/questionnaires/", json=payload, headers=admin_headers)
    assert response.status_code == 400

def test_list_questionnaires(client, student_headers):
    response = client.get("/questionnaires/", headers=student_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["questionnaire_number"] == 1

def test_update_questionnaire_admin(client, admin_headers):
    payload = {"questionnaire_number": 10}
    response = client.patch("/questionnaires/1", json=payload, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["questionnaire_number"] == 10

def test_delete_questionnaire_admin(client, admin_headers):
    # Crear un cuestionario sin preguntas hijas para eliminarlo
    create_res = client.post(
        "/questionnaires/",
        json={"questionnaire_number": 99, "category_id": 1},
        headers=admin_headers,
    )
    q_id = create_res.json()["id"]

    response = client.delete(f"/questionnaires/{q_id}", headers=admin_headers)
    assert response.status_code == 204
