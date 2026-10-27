import time
import pytest

@pytest.mark.usability
def test_api_interactive_response_time_budget(client, student_headers):
    """
    USABILITY TEST: Presupuesto de latencia para interactividad fluida en clientes.
    
    Según las heurísticas de Nielsen y Web Vitals, las respuestas de consulta frecuentes
    deben procesarse en menos de 200-250ms en entorno de pruebas para garantizar una
    experiencia de usuario ágil y sin bloqueos perceptibles en la app móvil y web.
    """
    benchmarks = [
        ("GET", "/", None),
        ("GET", "/categories/", student_headers),
        ("GET", "/questionnaires/", student_headers),
        ("GET", "/questions/", student_headers),
    ]

    for method, path, headers in benchmarks:
        start = time.perf_counter()
        if headers:
            res = client.get(path, headers=headers)
        else:
            res = client.get(path)
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert res.status_code == 200, f"Error en endpoint {path}"
        # Presupuesto: < 250ms por petición en memoria
        assert elapsed_ms < 250, (
            f"El endpoint {path} tardó {elapsed_ms:.2f}ms, superando el presupuesto de usabilidad (250ms)"
        )
