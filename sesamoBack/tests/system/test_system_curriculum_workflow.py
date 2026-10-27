import pytest

@pytest.mark.system
def test_system_curriculum_workflow_end_to_end(client, admin_headers, student_headers):
    """
    SYSTEM TEST: Workflow completo de creación y consulta de currículo académico.
    
    Flujo:
    1. Admin estructura una categoría académica y un cuestionario asociado.
    2. Admin publica preguntas con sus opciones A, B, C, D indicando la correcta.
    3. Estudiante navega el árbol curricular: Categoría -> Cuestionario -> Preguntas.
    4. El sistema protege el secreto pedagógico: El estudiante NO recibe el campo 'is_correct'.
    5. El Admin sí recibe el campo 'is_correct' para fines de auditoría.
    6. Admin modifica una pregunta y el estudiante recibe los cambios actualizados.
    """
    # 1. Admin crea categoría y cuestionario
    cat_res = client.post("/categories/", json={"name": "Biología Celular"}, headers=admin_headers)
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    q_res = client.post("/questionnaires/", json={"category_id": cat_id, "questionnaire_number": 5}, headers=admin_headers)
    assert q_res.status_code == 201
    questionnaire_id = q_res.json()["id"]

    # 2. Admin publica una pregunta con 4 opciones
    question_payload = {
        "questionnaire_id": questionnaire_id,
        "question_text": "¿Cuál es el organelo encargado de la respiración celular?",
    }
    question_res = client.post("/questions/", json=question_payload, headers=admin_headers)
    assert question_res.status_code == 201
    question_id = question_res.json()["id"]

    options_data = [
        {"question_id": question_id, "option_key": "A", "answer": "Ribosoma", "is_correct": False},
        {"question_id": question_id, "option_key": "B", "answer": "Mitocondria", "is_correct": True},
        {"question_id": question_id, "option_key": "C", "answer": "Aparato de Golgi", "is_correct": False},
        {"question_id": question_id, "option_key": "D", "answer": "Retículo Endoplasmático", "is_correct": False},
    ]

    created_option_ids = []
    for opt in options_data:
        opt_res = client.post("/answer-options/", json=opt, headers=admin_headers)
        assert opt_res.status_code == 201
        created_option_ids.append(opt_res.json()["id"])

    assert len(created_option_ids) == 4

    # 3. Estudiante navega el currículo
    # Categorías
    student_cats = client.get("/categories/", headers=student_headers)
    assert student_cats.status_code == 200
    assert any(c["id"] == cat_id and c["name"] == "Biología Celular" for c in student_cats.json())

    # Cuestionarios
    student_qs = client.get("/questionnaires/", headers=student_headers)
    assert student_qs.status_code == 200
    assert any(q["id"] == questionnaire_id for q in student_qs.json())

    # Preguntas
    student_questions = client.get("/questions/", headers=student_headers)
    assert student_questions.status_code == 200
    matched_q = next((q for q in student_questions.json() if q["id"] == question_id), None)
    assert matched_q is not None
    assert matched_q["question_text"] == "¿Cuál es el organelo encargado de la respiración celular?"

    # 4. Secreto pedagógico para estudiantes en answer-options
    student_opts_res = client.get("/answer-options/", headers=student_headers)
    assert student_opts_res.status_code == 200
    student_q_opts = [o for o in student_opts_res.json() if o["question_id"] == question_id]
    assert len(student_q_opts) == 4
    for opt in student_q_opts:
        assert "option_key" in opt
        assert "answer" in opt
        assert opt.get("is_correct") is None, "El campo 'is_correct' no debe ser revelado a los estudiantes."

    # 5. Admin sí puede ver 'is_correct'
    admin_opts_res = client.get("/answer-options/", headers=admin_headers)
    assert admin_opts_res.status_code == 200
    admin_q_opts = [o for o in admin_opts_res.json() if o["question_id"] == question_id]
    correct_count = sum(1 for opt in admin_q_opts if opt.get("is_correct") is True)
    assert correct_count == 1
    mitocondria_opt = next(opt for opt in admin_q_opts if opt["option_key"] == "B")
    assert mitocondria_opt["is_correct"] is True

    # 6. Admin actualiza texto de la pregunta y estudiante ve el cambio
    patch_q_res = client.patch(
        f"/questions/{question_id}",
        json={"question_text": "¿Cuál organelo genera ATP mediante respiración celular?"},
        headers=admin_headers
    )
    assert patch_q_res.status_code == 200

    q_updated = client.get(f"/questions/{question_id}", headers=student_headers)
    assert q_updated.status_code == 200
    assert q_updated.json()["question_text"] == "¿Cuál organelo genera ATP mediante respiración celular?"
