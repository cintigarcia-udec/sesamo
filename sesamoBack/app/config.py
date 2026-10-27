import base64
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    BASE_DIR: Path = Path(__file__).resolve().parent

    # Configuración de la base de datos
    mysql_url: str = "mysql+pymysql://user:pass@host/db"
    db_user: Optional[str] = None
    db_password: Optional[str] = None
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_name: Optional[str] = None
    
    # Localización de logs
    logs_path: str = "./project.log"

    # Configuración de App
    debug: bool = True
    environment: str = "development"
    root_path: str = "/api"
    logging_level: Optional[str] = 'DEBUG'
    allowed_origins: str = "*" # Cambiar a una lista de URLs permitidas en producción, separadas por comas

    ENCRYPTION_KEY: bytes = base64.b64encode(b"your-new-encryption-key-00000000")
    
    # JWT Configuration
    SECRET_KEY: str = "your-secret-key-change-it-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def model_post_init(self, __context):
        if self.db_user and self.db_host:
            port = self.db_port or 3306
            name = self.db_name or "sesamo"
            pwd = f":{self.db_password}" if self.db_password else ""
            self.mysql_url = f"mysql+pymysql://{self.db_user}{pwd}@{self.db_host}:{port}/{name}"
        if isinstance(self.ENCRYPTION_KEY, str):
            self.ENCRYPTION_KEY = self.ENCRYPTION_KEY.encode('utf-8')

settings = Settings()