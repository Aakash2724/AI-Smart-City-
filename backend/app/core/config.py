import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Search and load .env from multiple standard locations
base_dir = Path(__file__).resolve().parent.parent.parent
env_candidates = [
    Path(os.getcwd()) / ".env",
    base_dir / ".env",
    base_dir.parent / ".env",
    Path(os.getcwd()) / "backend" / ".env"
]

for env_path in env_candidates:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)

db_path_posix = (base_dir / "smart_city.db").as_posix()
default_db_url = f"sqlite:///{db_path_posix}"

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Smart City Complaint Management & Predictive Analytics Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration (SQLite default for easy local dev, PostgreSQL compatible)
    DATABASE_URL: str = os.getenv("DATABASE_URL", default_db_url)
    
    # AI Engine Keys & Providers
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Preferred LLM Provider: "groq", "openai", "gemini", or "mock"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq" if os.getenv("GROQ_API_KEY") else "mock")
    
    # Uploads & Assets
    UPLOAD_DIR: str = str(base_dir / "uploads")
    
    # Transactional Email API Keys (Resend / SendGrid / Brevo)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")

    # SMTP Simple Mail Transfer Protocol Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "SmartGov AI Municipal Redressal")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

    class Config:
        case_sensitive = True
        extra = "allow"

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
