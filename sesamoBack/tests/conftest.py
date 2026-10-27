import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
settings.environment = 'testing'

from app.utilities.db import Base, get_db
from app.models.role import Role
from app.models.school import School
from app.models.category import Category
from app.models.questionnaire import Questionnaire
from app.models.question import Question
from app.models.answer_option import AnswerOption
from app.models.user_response import UserResponse
from app.models.user import User, TypeDocumentIdentity
from app.utilities.jwt import create_access_token
from app.main import app

# In-memory SQLite engine shared across connections in the test
engine = create_engine(
    'sqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool
)

@event.listens_for(engine, 'connect')
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute('PRAGMA foreign_keys=ON;')
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Provides a fresh transactional session for a test with seed data."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Seed core roles
    admin_role = Role(id=1, name="Admin")
    student_role = Role(id=2, name="Estudiante")
    session.add_all([admin_role, student_role])

    # Seed test school
    school = School(id=1, name="Colegio de Prueba")
    session.add(school)

    # Seed test admin user
    admin_user = User(
        id=1,
        name="Admin",
        last_name="Tester",
        email="admin@test.com",
        type_document_identity=TypeDocumentIdentity.CC,
        document_identity="111111",
        role_id=1,
        school_id=1,
    )
    admin_user.set_password("AdminPass123!")
    session.add(admin_user)

    # Seed test student user
    student_user = User(
        id=2,
        name="Estudiante",
        last_name="Tester",
        email="student@test.com",
        type_document_identity=TypeDocumentIdentity.TI,
        document_identity="222222",
        role_id=2,
        school_id=1,
    )
    student_user.set_password("StudentPass123!")
    session.add(student_user)

    # Seed default category and questionnaire
    category = Category(id=1, name="Matemáticas")
    session.add(category)
    session.flush()

    questionnaire = Questionnaire(id=1, questionnaire_number=1, category_id=1)
    session.add(questionnaire)
    session.flush()

    question = Question(id=1, question_text="¿Cuánto es 2 + 2?", questionnaire_id=1)
    session.add(question)
    session.flush()

    options = [
        AnswerOption(id=1, question_id=1, option_key="A", answer="3", is_correct=False),
        AnswerOption(id=2, question_id=1, option_key="B", answer="4", is_correct=True),
        AnswerOption(id=3, question_id=1, option_key="C", answer="5", is_correct=False),
        AnswerOption(id=4, question_id=1, option_key="D", answer="6", is_correct=False),
    ]
    session.add_all(options)
    session.commit()

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_headers(db_session):
    """HTTP Authorization headers for seeded Admin user."""
    admin = db_session.query(User).filter_by(id=1).first()
    token = create_access_token(data={
        "sub": admin.email,
        "id": admin.id,
        "name": admin.name,
        "last_name": admin.last_name,
        "role_id": admin.role_id,
        "school_id": admin.school_id,
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def student_headers(db_session):
    """HTTP Authorization headers for seeded Student user."""
    student = db_session.query(User).filter_by(id=2).first()
    token = create_access_token(data={
        "sub": student.email,
        "id": student.id,
        "name": student.name,
        "last_name": student.last_name,
        "role_id": student.role_id,
        "school_id": student.school_id,
    })
    return {"Authorization": f"Bearer {token}"}
