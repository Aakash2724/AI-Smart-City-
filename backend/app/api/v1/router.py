from fastapi import APIRouter
from app.api.v1.endpoints import complaints, vision, nlp, predictions, analytics, auth

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router)
api_v1_router.include_router(complaints.router)
api_v1_router.include_router(vision.router)
api_v1_router.include_router(nlp.router)
api_v1_router.include_router(predictions.router)
api_v1_router.include_router(analytics.router)

@api_v1_router.get("/health", tags=["Health"])
@api_v1_router.head("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "AI Smart City API",
        "yolo_vision": "active"
    }



