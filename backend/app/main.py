import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.router import api_v1_router
from app.seed_data import seed_database

# Create DB tables
Base.metadata.create_all(bind=engine)

def ensure_sqlite_columns():
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check users table columns
            res = conn.execute(text("PRAGMA table_info(users)"))
            cols = [row[1] for row in res.fetchall()]
            if "photo_url" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN photo_url TEXT;"))
                conn.commit()
    except Exception as e:
        print(f"[Main] Column migration notice: {e}")

ensure_sqlite_columns()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="End-to-End Intelligent Decision & Predictive Analytics Platform for Smart Cities."
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded media files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Mount API Router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    try:
        seed_database()
    except Exception as e:
        print(f"[Main] Seed database notice: {e}")

@app.get("/")
def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/dashboard/stats")
def dashboard_stats_alias():
    from app.api.v1.endpoints.analytics import get_analytics_summary
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        return get_analytics_summary(db=db)
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["app"])

