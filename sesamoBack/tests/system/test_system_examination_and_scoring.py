import json
import pytest

@pytest.mark.system
def test_system_examination_and_scoring_workflow_end_to_end(client, admin_headers, student_headers):
    """
    SYSTEM TEST: Workflow completo de presentación de examen, cálculo/envío de puntaje,
    consulta de resultados y auditoría administrativa.
    
    Flujo:
    1. Estudiante presenta cuestionario y envía sus respuestas y puntaje a /user-responses/.
    2. El sistema valida la integridad referencial y almacena la respuesta (201 Created).
    3. Estudiante consulta el detalle de su resultado por ID.
    4. Estudiante no tiene privilegios para listar todas las respuestas del sistema (403).
    5. Admin consulta el reporte global de respuestas de estudiantes para análisis escolar.
    6. Admin puede corregir o actualizar un puntaje tras revisión pedagógica.
    """
    student_user_id = 2  # Id del usuario estudiante sembrado
    questionnaire_id = 1 # Id del cuestionario sembrado

    # 1. Envío de examen completado
    answers_data = json.dumps({"1": "B"})
    submission_payload = {
        "user_id": student_user_id,
        "questionnaire_id": questionnaire_id,
        "score": 100.0,
        "answers": answers_data,
    }

    submit_res = client.post("/user-responses/", json=submission_payload, headers=student_headers)
    assert submit_res.status_code == 201
    created_response = submit_res.json()
    response_id = created_response["id"]
    assert created_response["user_id"] == student_user_id
    assert created_response["questionnaire_id"] == questionnaire_id
    assert created_response["score"] == 100.0
    assert created_response["answers"] == answers_data

    # 2. Estudiante consulta su respuesta individual
    detail_res = client.get(f"/user-responses/{response_id}", headers=student_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == response_id
    assert detail_res.json()["score"] == 100.0

    # 3. Estudiante no puede ver el listado general de respuestas de todos los alumnos
    list_as_student = client.get("/user-responses/", headers=student_headers)
    assert list_as_student.status_code == 403

    # 4. Admin sí puede ver el listado general para auditoría
    list_as_admin = client.get("/user-responses/", headers=admin_headers)
    assert list_as_admin.status_code == 200
    assert any(r["id"] == response_id for r in list_as_admin.json())

    # 5. Admin actualiza puntaje tras recalificación pedagógica
    patch_res = client.patch(
        f"/user-responses/{response_id}",
        json={"score": 95.0},
        headers=admin_headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["score"] == 95.0

    # Estudiante verifica puntaje actualizado
    refreshed_res = client.get(f"/user-responses/{response_id}", headers=student_headers)
    assert refreshed_res.status_code == 200
    assert refreshed_res.json()["score"] == 95.0

@pytest.mark.system
def test_system_examination_rejects_invalid_questionnaire(client, student_headers):
    """
    SYSTEM TEST: Integridad referencial: rechazar respuestas para cuestionario inexistente.
    """
    invalid_q_payload = {
        "user_id": 2,
        "questionnaire_id": 999999,
        "score": 50.0,
        "answers": "{}",
    }
    err_q_res = client.post("/user-responses/", json=invalid_q_payload, headers=student_headers)
    assert err_q_res.status_code == 400
    assert "cuestionario" in err_q_res.json()["detail"].lower() or "integridad" in err_q_res.json()["detail"].lower()

@pytest.mark.system
def test_system_examination_rejects_invalid_user(client, student_headers):
    """
    SYSTEM TEST: Integridad referencial: rechazar respuestas para usuario inexistente.
    """
    invalid_u_payload = {
        "user_id": 888888,
        "questionnaire_id": 1,
        "score": 50.0,
        "answers": "{}",
    }
    err_u_res = client.post("/user-responses/", json=invalid_u_payload, headers=student_headers)
    assert err_u_res.status_code == 400
    assert "usuario" in err_u_res.json()["detail"].lower() or "integridad" in err_u_res.json()["detail"].lower()
