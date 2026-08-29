from fastapi import APIRouter
from app.api.v1.endpoints import complaints, vision, nlp, agents, predictions, analytics, auth

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router)
api_v1_router.include_router(complaints.router)
api_v1_router.include_router(vision.router)
api_v1_router.include_router(nlp.router)
api_v1_router.include_router(agents.router)
api_v1_router.include_router(predictions.router)
api_v1_router.include_router(analytics.router)

@api_v1_router.get("/departments", tags=["Departments"])
def get_departments_list():
    from app.core.database import SessionLocal
    from app.models.db_models import Department
    db = SessionLocal()
    try:
        departments = db.query(Department).all()
        return [
            {
                "id": d.id,
                "name": d.name,
                "code": d.code,
                "contact_email": d.contact_email,
                "active_headcount": d.active_headcount
            }
            for d in departments
        ]
    finally:
        db.close()


