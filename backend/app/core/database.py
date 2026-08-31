from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL.strip()

# Normalize Heroku/Render/Supabase postgres:// scheme to SQLAlchemy postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Handle SQLite vs PostgreSQL engine parameters
if "sqlite" in db_url:
    engine = create_engine(
        db_url, 
        connect_args={"check_same_thread": False}
    )
else:
    # Cloud PostgreSQL (Neon / Supabase / AWS RDS / Render Postgres)
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

