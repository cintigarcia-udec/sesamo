import pytest

@pytest.mark.usability
def test_pagination_parameters_consistency(client, admin_headers):
    """
    USABILITY TEST (Nielsen Heurística #4): Consistencia en los parámetros de paginación.
    
    Verifica que todos los endpoints de colecciones expongan de forma predecible
    los parámetros de consulta `skip` y `limit`, respetando los límites solicitados.
    """
    endpoints = [
        "/categories/",
        "/questionnaires/",
        "/questions/",
        "/answer-options/",
        "/user-responses/",
    ]

    for path in endpoints:
        # Petición con limit=1
        res = client.get(f"{path}?skip=0&limit=1", headers=admin_headers)
        assert res.status_code == 200, f"Error al consultar paginación en {path}"
        data = res.json()
        assert isinstance(data, list), f"La respuesta de {path} debe ser una lista"
        assert len(data) <= 1, f"El endpoint {path} no respetó limit=1"

@pytest.mark.usability
def test_user_responses_never_expose_password_hashes(client, admin_headers):
    """
    USABILITY & SECURITY TEST: Higiene de esquemas y protección de secretos.
    
    Verifica que la serialización de usuarios jamás exponga contraseñas ni hashes
    al frontend o aplicaciones cliente.
    """
    # 1. Registro de usuario
    reg_payload = {
        "name": "Prueba",
        "last_name": "Seguridad",
        "email": "seguridad.test@sesamo.com",
        "password": "SuperSecretPassword123!",
        "type_document_identity": "cc",
        "document_identity": "555444333",
        "school_id": 1,
    }
    reg_res = client.post("/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    user_data = reg_res.json()

    # Comprobar que en la respuesta de registro no aparezca el password ni el hash
    assert "password" not in user_data
    assert "hashed_password" not in user_data
    assert "password_hash" not in user_data

    # 2. Consulta de usuario por ID por el Administrador
    user_id = user_data["id"]
    get_res = client.get(f"/users/{user_id}", headers=admin_headers)
    assert get_res.status_code == 200
    fetched_user = get_res.json()

    assert "password" not in fetched_user
    assert "hashed_password" not in fetched_user

@pytest.mark.usability
def test_json_responses_have_correct_content_type(client):
    """
    USABILITY TEST: Los endpoints deben responder con cabecera application/json estándar
    para que clientes HTTP (Axios, Fetch, Retrofit, etc.) los parseen automáticamente.
    """
    res = client.get("/")
    assert res.status_code == 200
    assert "application/json" in res.headers.get("content-type", "")
