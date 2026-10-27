import pytest

@pytest.mark.usability
def test_authentication_error_messages_are_clear_and_safe(client):
    """
    USABILITY TEST (Nielsen Heurística #9): Mensajes de error claros y no ambiguos en login.
    
    Verifica que:
    - Las credenciales inválidas informen claramente del error al usuario.
    - No se filtren detalles criptográficos ni si fue el correo o la clave la que falló (seguridad OWASP).
    """
    response = client.post("/auth/login", json={"email": "noexiste@sesamo.com", "password": "wrong"})
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
    assert "credenciales inválidas" in data["detail"].lower()
    # No debe filtrar nombres de tablas, columnas SQL ni volcados de traceback
    assert "traceback" not in data["detail"].lower()
    assert "sql" not in data["detail"].lower()

@pytest.mark.usability
def test_validation_errors_provide_structured_field_locations(client):
    """
    USABILITY TEST: Los errores de validación (422) deben indicar qué campo falló
    para permitir que el cliente Web o Mobile resalte el input correspondiente.
    """
    # Enviar payload sin campos obligatorios
    response = client.post("/auth/register", json={})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    errors = data["detail"]
    assert isinstance(errors, list)
    assert len(errors) > 0

    # Cada error de validación debe exponer 'loc' (ubicación del campo) y 'msg' (razón)
    for err in errors:
        assert "loc" in err, "El error de validación debe incluir 'loc' para mapeo en UI"
        assert "msg" in err, "El error de validación debe incluir 'msg' comprensible"

    # Verificar que identifique campos ausentes como 'email' y 'password'
    missing_fields = [e["loc"][-1] for e in errors if "loc" in e]
    assert "email" in missing_fields
    assert "password" in missing_fields
    assert "name" in missing_fields

@pytest.mark.usability
def test_authorization_errors_explain_required_privileges(client, student_headers):
    """
    USABILITY TEST: Errores 403 Forbidden deben explicar qué rol se requiere.
    """
    response = client.get("/users/", headers=student_headers)
    assert response.status_code == 403
    data = response.json()
    assert "detail" in data
    assert "administradores" in data["detail"].lower() or "permisos" in data["detail"].lower()

@pytest.mark.usability
def test_duplicate_registration_error_is_human_readable(client):
    """
    USABILITY TEST: Errores de duplicidad deben traducirse a mensajes de usuario amigables,
    evitando exponer excepciones crudas como IntegrityError de la base de datos.
    """
    payload = {
        "name": "Duplicado",
        "last_name": "Test",
        "email": "admin@test.com",  # Ya existe
        "type_document_identity": "cc",
        "document_identity": "999888",
        "password": "Password123!",
        "school_id": 1,
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 400
    detail = response.json()["detail"].lower()
    assert "email ya está en uso" in detail or "ya está registrado" in detail
    assert "integrityerror" not in detail
    assert "operationalerror" not in detail
