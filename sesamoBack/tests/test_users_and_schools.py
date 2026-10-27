def test_list_schools_as_admin(client, admin_headers):
    response = client.get("/schools/", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["name"] == "Colegio de Prueba"

def test_list_schools_as_student_forbidden(client, student_headers):
    response = client.get("/schools/", headers=student_headers)
    assert response.status_code == 403

def test_create_school_admin(client, admin_headers):
    payload = {"name": "Liceo Departamental"}
    response = client.post("/schools/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    assert response.json()["name"] == "Liceo Departamental"

def test_create_school_student_forbidden(client, student_headers):
    payload = {"name": "Colegio Ilegal"}
    response = client.post("/schools/", json=payload, headers=student_headers)
    assert response.status_code == 403

def test_list_users_as_admin(client, admin_headers):
    response = client.get("/users/", headers=admin_headers)
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 2
    emails = [u["email"] for u in users]
    assert "admin@test.com" in emails
    assert "student@test.com" in emails

def test_list_users_as_student_forbidden(client, student_headers):
    response = client.get("/users/", headers=student_headers)
    assert response.status_code == 403

def test_get_user_by_id_as_admin(client, admin_headers):
    response = client.get("/users/1", headers=admin_headers)
    assert response.status_code == 200
    user = response.json()
    assert user["id"] == 1
    assert user["email"] == "admin@test.com"

def test_list_roles_as_admin(client, admin_headers):
    response = client.get("/roles/", headers=admin_headers)
    assert response.status_code == 200
    roles = response.json()
    assert len(roles) >= 2
    names = [r["name"] for r in roles]
    assert "Admin" in names
    assert "Estudiante" in names

def test_list_roles_as_student_forbidden(client, student_headers):
    response = client.get("/roles/", headers=student_headers)
    assert response.status_code == 403
