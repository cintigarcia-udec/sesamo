import pytest

@pytest.mark.usability
def test_openapi_specification_completeness_and_ergonomics(client):
    """
    USABILITY TEST: Descubribilidad y completitud de la documentación interactiva OpenAPI.
    
    Verifica que:
    1. El esquema /openapi.json esté disponible y cumpla el estándar OpenAPI 3.x.
    2. Contenga metadatos claros (título del sistema, versión).
    3. Todos los recursos principales estén documentados en paths.
    4. Cada operación tenga tags para navegación estructurada en Swagger y ReDoc.
    """
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    # Estándar y metadatos
    assert "openapi" in schema
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "Sesamo API"
    assert "version" in schema["info"]

    # Cobertura de rutas principales del sistema
    paths = schema.get("paths", {})
    required_paths = [
        "/users/",
        "/schools/",
        "/roles/",
        "/categories/",
        "/questionnaires/",
        "/questions/",
        "/answer-options/",
        "/user-responses/",
        "/auth/login",
        "/auth/register",
    ]
    for path in required_paths:
        assert path in paths, f"La ruta {path} debe estar documentada en OpenAPI para la usabilidad de los clientes"

    # Verificación de ergonomía: Todas las operaciones deben tener tags para agrupación
    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method in {"get", "post", "put", "patch", "delete"}:
                assert "tags" in operation and len(operation["tags"]) > 0, (
                    f"La operación {method.upper()} {path} carece de tags de agrupación en OpenAPI"
                )

@pytest.mark.usability
def test_interactive_documentation_ui_accessible(client):
    """
    USABILITY TEST: Disponibilidad de las interfaces Swagger UI y ReDoc para desarrolladores.
    """
    # Swagger UI
    swagger_res = client.get("/docs")
    assert swagger_res.status_code == 200
    assert "text/html" in swagger_res.headers.get("content-type", "")
    assert "swagger" in swagger_res.text.lower() or "openapi" in swagger_res.text.lower()

    # ReDoc
    redoc_res = client.get("/redoc")
    assert redoc_res.status_code == 200
    assert "text/html" in redoc_res.headers.get("content-type", "")
    assert "redoc" in redoc_res.text.lower()
