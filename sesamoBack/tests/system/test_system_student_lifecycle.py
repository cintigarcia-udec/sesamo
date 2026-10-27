import pytest

@pytest.mark.system
def test_system_student_lifecycle_end_to_end(client, admin_headers):
    """
    SYSTEM TEST: Ciclo de vida completo de Estudiante e Institución Educativa.
    
    Flujo:
    1. Admin crea una nueva institución educativa en el sistema.
    2. Un nuevo estudiante se auto-registra vinculado a dicha institución.
    3. El estudiante inicia sesión mediante /auth/login y obtiene su JWT.
    4. El estudiante verifica sus límites de seguridad (RBAC) frente a rutas de administración.
    5. El Admin audita los usuarios registrados, localiza al estudiante y actualiza sus datos.
    6. Se comprueba la inviolabilidad de unicidad del email impidiendo registros duplicados.
    """
    # 1. Admin crea nueva institución
    school_payload = {"name": "Colegio Mayor de los Andes"}
    school_res = client.post("/schools/", json=school_payload, headers=admin_headers)
    assert school_res.status_code == 201
    school_id = school_res.json()["id"]
    assert school_res.json()["name"] == "Colegio Mayor de los Andes"

    # 2. Estudiante se registra
    student_email = "nuevo.alumno@andes.edu.co"
    student_raw_pass = "AlumnoSeguro2026!"
    register_payload = {
        "name": "Valentina",
        "last_name": "Gómez",
        "email": student_email,
        "password": student_raw_pass,
        "type_document_identity": "ti",
        "document_identity": "1098765432",
        "school_id": school_id,
    }
    reg_res = client.post("/auth/register", json=register_payload)
    assert reg_res.status_code == 201
    student_id = reg_res.json()["id"]
    assert reg_res.json()["email"] == student_email

    # 3. Estudiante inicia sesión y obtiene JWT
    login_res = client.post("/auth/login", json={
        "email": student_email,
        "password": student_raw_pass
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    student_token = token_data["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 4. Verificación de barreras de seguridad (RBAC) para el estudiante
    # Estudiante no puede crear otra escuela
    assert client.post("/schools/", json={"name": "Fake School"}, headers=student_headers).status_code == 403
    # Estudiante no puede crear categorías
    assert client.post("/categories/", json={"name": "Fake Category"}, headers=student_headers).status_code == 403
    # Estudiante no puede acceder al listado de usuarios del sistema
    assert client.get("/users/", headers=student_headers).status_code == 403

    # 5. Admin localiza al estudiante y actualiza su nombre
    users_list_res = client.get("/users/", headers=admin_headers)
    assert users_list_res.status_code == 200
    matched_user = next((u for u in users_list_res.json() if u["email"] == student_email), None)
    assert matched_user is not None
    assert matched_user["id"] == student_id

    patch_res = client.patch(f"/users/{student_id}", json={"name": "Valentina María"}, headers=admin_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Valentina María"

    # Verificar que el usuario actualizado se consulta correctamente
    user_get_res = client.get(f"/users/{student_id}", headers=admin_headers)
    assert user_get_res.status_code == 200
    assert user_get_res.json()["name"] == "Valentina María"

    # 6. Regla de integridad: prevenir registros duplicados
    dup_res = client.post("/auth/register", json=register_payload)
    assert dup_res.status_code == 400
    assert "ya está en uso" in dup_res.json()["detail"].lower()
