import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Dict, Any, Optional
import shutil

from app.core.config import settings
from app.services.vision_service import vision_service

router = APIRouter(prefix="/vision", tags=["Vision AI"])

@router.post("/analyze")
async def analyze_civic_image(
    image: UploadFile = File(...),
    text_hint: Optional[str] = Form("")
) -> Dict[str, Any]:
    """Analyzes an uploaded civic image and returns YOLOv8 detections with bounding boxes."""
    if not image:
        raise HTTPException(status_code=400, detail="Image file is required")
        
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"temp_{uuid.uuid4().hex}_{image.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
        
    try:
        detections = vision_service.analyze_image(file_path, text_hint=text_hint or "")
        return {
            "success": True,
            "filename": image.filename,
            "detections_count": len(detections),
            "detections": detections
        }
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
