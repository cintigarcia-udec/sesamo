# Documentación de Pruebas (Unitarias, Sistema y Usabilidad) - Sésamo Backend

Este documento detalla la arquitectura, cobertura, ejecución, validación de integridad (Mutation Testing) y especificación de la suite de pruebas de **Sésamo Backend** (FastAPI, SQLAlchemy, SQLite in-memory y Pytest).

---

## 🎯 1. Niveles de Prueba en Sésamo Backend

| Tipo | Enfoque | Objetivo en Sésamo Backend |
| :--- | :--- | :--- |
| **Pruebas Unitarias** (`tests/test_*.py`) | Componente o endpoint aislado. | Valida hashing bcrypt, codificación JWT, códigos HTTP individuales (200, 401, 403, 404) y lógica atómica de repositorios con fixtures predefinidos. |
| **Pruebas de Sistema** (`tests/system/test_*.py`) | Workflows de negocio completos de extremo a extremo. | Simula la interacción de múltiples actores reales (Admin y Estudiantes) a lo largo de ciclos de vida completos: registro institucional $\to$ onboarding estudiantil $\to$ estructuración curricular $\to$ presentación y calificación de exámenes $\to$ auditoría administrativa y restricciones relacionales en cascada. |
| **Pruebas de Usabilidad** (`tests/usability/test_*.py`) | Ergonomía de API y Experiencia de Desarrollador (DX). | Valida heurísticas de diseño de APIs (Nielsen): completitud y navegabilidad de la documentación interactiva OpenAPI/Swagger (`/docs`, `/redoc`), claridad y accionabilidad de mensajes de error en español sin filtración de trazas internas, consistencia de paginación (`skip`, `limit`), higiene de secretos y presupuesto de latencia interactiva (< 250ms). |

---

## 🏗️ 2. Arquitectura del Entorno de Pruebas

Para garantizar pruebas deterministas, rápidas y reproducibles sin depender de un servidor MySQL externo:

- **Motor de Base de Datos en Memoria**: SQLite en memoria (`sqlite:///:memory:`) con `StaticPool` compartido entre conexiones de prueba.
- **Integridad Referencial Real**: Activación de `PRAGMA foreign_keys = ON;` al conectar, garantizando que las restricciones de claves foráneas (`FOREIGN KEY`) entre preguntas, cuestionarios, escuelas, usuarios y respuestas se comporten con estricta paridad con el entorno de producción.
- **Aislamiento Transaccional**: Cada prueba se ejecuta en su propio contexto transaccional con rollback automático.
- **Inyección de Dependencias FastAPI**: Sobreescritura de `get_db` mediante `app.dependency_overrides`, permitiendo que middlewares de seguridad (`get_current_user`, `get_current_admin`) interactúen con el estado de la base de datos de pruebas.

---

## 📂 3. Estructura de la Suite Completa (63 Tests)

### A. Pruebas Unitarias (46 Tests)

| Archivo | Tests | Descripción y Cobertura |
| :--- | :---: | :--- |
| **[`tests/test_auth.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/test_auth.py)** | **8** | Hashing bcrypt en `User`, creación y verificación de tokens JWT, login de admin y estudiante, rechazo 401 por contraseña o email errado, registro de estudiantes y detección de email duplicado (400). |
| **[`tests/test_questions.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/test_questions.py)** | **11** | Creación de preguntas por Admin (201), prohibición a Estudiantes (403), rechazo sin autenticación (401), validación de cuestionario inexistente (400), listado (`GET`), consulta por ID, 404 para IDs inexistentes, actualización (`PATCH`) y eliminación (`DELETE`). |
| **[`tests/test_answer_options.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/test_answer_options.py)** | **7** | Creación de opciones por Admin con `is_correct`, rechazo a Estudiantes (403), **seguridad RBAC** (ocultamiento del campo `is_correct` para estudiantes y visualización para administradores), validación de integridad de claves foráneas. |
| **[`tests/test_questionnaires_and_categories.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/test_questionnaires_and_categories.py)** | **11** | Operaciones CRUD completas de categorías y cuestionarios, control de acceso por roles, validación de integridad referencial (cuestionario con categoría inexistente produce error 400). |
| **[`tests/test_users_and_schools.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/test_users_and_schools.py)** | **9** | Restricción estricta de rutas de `/schools/`, `/roles/` y `/users/` exclusivas para Administradores, denegando el acceso (403) a usuarios con rol Estudiante. |

### B. Pruebas de Sistema E2E (7 Tests)

| Archivo | Tests | Workflow de Negocio Validado |
| :--- | :---: | :--- |
| **[`tests/system/test_system_student_lifecycle.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/system/test_system_student_lifecycle.py)** | **1** | **Ciclo de Vida del Estudiante e Institución**: <br>1. Admin crea nueva escuela.<br>2. Estudiante se auto-registra vinculado a dicha escuela.<br>3. Estudiante inicia sesión (`/auth/login`) y obtiene JWT.<br>4. Se verifican las fronteras RBAC impidiendo acceso a rutas admin.<br>5. Admin lista usuarios, localiza al estudiante y actualiza su perfil.<br>6. Se valida el bloqueo estricto a intentos de registro duplicado. |
| **[`tests/system/test_system_curriculum_workflow.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/system/test_system_curriculum_workflow.py)** | **1** | **Workflow Curricular Completo**: <br>1. Admin crea categoría y cuestionario.<br>2. Admin publica preguntas con opciones A-D marcando la correcta.<br>3. Estudiante navega Categoría $\to$ Cuestionario $\to$ Preguntas $\to$ Opciones.<br>4. **Protección del secreto pedagógico**: Estudiante recibe opciones pero `is_correct` no se expone.<br>5. Admin sí audita qué opción es la correcta.<br>6. Admin edita pregunta y el estudiante recibe el cambio actualizado. |
| **[`tests/system/test_system_examination_and_scoring.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/system/test_system_examination_and_scoring.py)** | **3** | **Evaluación, Puntajes y Auditoría**: <br>1. Estudiante envía respuestas y puntaje a `/user-responses/` (201).<br>2. Estudiante consulta el detalle de su resultado por ID.<br>3. Estudiante no puede acceder al listado global de respuestas ajenas (403).<br>4. Admin consulta el consolidado de exámenes para analítica escolar.<br>5. Admin recalifica o actualiza el puntaje (PATCH).<br>6. El sistema rechaza respuestas vinculadas a cuestionarios o usuarios inexistentes (400). |
| **[`tests/system/test_system_cascade_and_invariants.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/system/test_system_cascade_and_invariants.py)** | **2** | **Invariantes de Seguridad y Concurrencia**: <br>1. Verificación en matriz de todos los endpoints protegidos contra llamadas anónimas y tokens falsificados/manipulados (401).<br>2. **Aislamiento multi-usuario**: Dos estudiantes independientes resuelven el mismo examen simultáneamente; se valida que no hay colisión, sobreescritura ni fuga cruzada de datos. |

### C. Pruebas de Usabilidad y Experiencia de Desarrollador (10 Tests)

| Archivo | Tests | Heurística de Usabilidad y Ergonomía Evaluada |
| :--- | :---: | :--- |
| **[`tests/usability/test_api_documentation_usability.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/usability/test_api_documentation_usability.py)** | **2** | **Descubribilidad y Documentación Interactiva**: <br>• Esquema `/openapi.json` completo y válido conforme a OpenAPI 3.x.<br>• Documentación de todos los paths clave (`/users/`, `/schools/`, `/roles/`, `/categories/`, `/questionnaires/`, `/questions/`, `/answer-options/`, `/user-responses/`, `/auth/*`).<br>• Tags obligatorios en cada operación para navegación estructurada en Swagger UI y ReDoc.<br>• Carga exitosa de Swagger UI (`/docs`) y ReDoc (`/redoc`). |
| **[`tests/usability/test_error_actionability_usability.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/usability/test_error_actionability_usability.py)** | **4** | **Accionabilidad de Errores (Heurística Nielsen #9)**: <br>• Mensajes de error claros y no ambiguos en login (`"Credenciales inválidas"`) sin fuga de trazas SQL o de backend.<br>• Errores de validación Pydantic (422) con localización estructurada (`loc`) y mensaje (`msg`) para mapeo directo a campos en UI.<br>• Claridad en rechazo 403 Forbidden explicando permisos requeridos.<br>• Mensajes legibles en duplicidad de correo evitando excepciones SQLAlchemy crudas. |
| **[`tests/usability/test_api_consistency_and_ergonomics.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/usability/test_api_consistency_and_ergonomics.py)** | **3** | **Consistencia y Estándares (Heurística Nielsen #4)**: <br>• Uniformidad de parámetros de paginación (`skip`, `limit`) a través de todas las colecciones.<br>• Protección de secretos: respuestas de usuario nunca exponen contraseñas ni hashes en JSON.<br>• Cabecera `Content-Type: application/json` consistente. |
| **[`tests/usability/test_latency_and_responsiveness_budget.py`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoBack/tests/usability/test_latency_and_responsiveness_budget.py)** | **1** | **Presupuesto de Latencia para Interactividad Fluida**: <br>• Verificación de que las consultas interactivas principales (`GET /`, `/categories/`, `/questionnaires/`, `/questions/`) respondan en menos de 250ms, garantizando fluidez en clientes móviles y web. |

---

## 🛡️ 4. Evidencia contra Falsos Positivos (Mutation Testing)

Para certificar que los tests no están diseñados para dar "PASS" de manera complaciente o trivial, se sometieron a **Pruebas de Mutación** (alteración intencional de la lógica de negocio para provocar fallos):

### Experimento A: Inversión de Permisos Administrativos
Se alteró temporalmente la función de seguridad `get_current_admin` en `app/utilities/jwt.py`:
```python
# Mutación inyectada:
if user.role_id == 1:  # Bloquea al Admin y deja pasar al estudiante
    raise HTTPException(status_code=403, detail="...")
```
**Resultado obtenido:**
```text
FAILED tests/test_questions.py::test_create_question_as_admin_success - assert 403 == 201
FAILED tests/test_questions.py::test_create_question_as_student_forbidden - assert 201 == 403
FAILED tests/test_questions.py::test_update_question_as_admin - assert 403 == 200
FAILED tests/test_questions.py::test_delete_question_as_admin - assert 403 == 204
========================= 7 failed, 4 passed in 4.20s ==========================
```
> **Conclusión**: Los tests no asumen éxito arbitrario; fallan de inmediato si un rol no autorizado logra acceder o si el administrador es bloqueado.

### Experimento B: Vulnerabilidad en Verificación de Contraseñas
Se modificó `check_password` en `app/models/user.py` para devolver siempre `True`:
```python
# Mutación inyectada:
return True  # Acepta contraseñas erradas sin validar el hash
```
**Resultado obtenido:**
```text
FAILED tests/test_auth.py::test_login_wrong_password - assert 200 == 401
============================== 1 failed in 0.39s ===============================
```
> **Conclusión**: La prueba detecta que el sistema aceptó una contraseña inválida y exige de forma no negociable el código `401 Unauthorized`.

---

## 🚀 5. Guía de Ejecución

### Ejecutar toda la suite (Unitarias + Sistema + Usabilidad):
```bash
cd sesamoBack
uv run pytest
```

### Ejecutar ÚNICAMENTE las Pruebas de Usabilidad:
```bash
cd sesamoBack
uv run pytest tests/usability -v
```

### Ejecutar ÚNICAMENTE las Pruebas de Sistema:
```bash
cd sesamoBack
uv run pytest tests/system -v
```

### Ejecutar ÚNICAMENTE las Pruebas Unitarias:
```bash
cd sesamoBack
uv run pytest tests/test_*.py -v
```

### Resultado de la última ejecución completa:
```text
tests/system/test_system_cascade_and_invariants.py ..                    [  3%]
tests/system/test_system_curriculum_workflow.py .                        [  4%]
tests/system/test_system_examination_and_scoring.py ...                  [  9%]
tests/system/test_system_student_lifecycle.py .                          [ 11%]
tests/test_answer_options.py .......                                     [ 22%]
tests/test_auth.py ........                                              [ 34%]
tests/test_questionnaires_and_categories.py ...........                  [ 52%]
tests/test_questions.py ...........                                      [ 69%]
tests/test_users_and_schools.py .........                                [ 84%]
tests/usability/test_api_consistency_and_ergonomics.py ...               [ 88%]
tests/usability/test_api_documentation_usability.py ..                   [ 92%]
tests/usability/test_error_actionability_usability.py ....               [ 98%]
tests/usability/test_latency_and_responsiveness_budget.py .              [100%]

============================= 63 passed in 23.76s ==============================
```
