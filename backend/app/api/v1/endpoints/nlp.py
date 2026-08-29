import os
import json
import httpx
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Form, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.nlp_service import nlp_service
from app.services.llm_service import llm_service

router = APIRouter(prefix="/nlp", tags=["NLP Engine"])


class VoiceProcessPayload(BaseModel):
    spoken_text: str
    location_hint: Optional[str] = ""


@router.post("/process")
def process_nlp_text(text: str = Form(...), location_hint: str = Form("")) -> Dict[str, Any]:
    """Processes citizen text for language detection, translation, summary, and entity extraction."""
    return {"success": True, "nlp": nlp_service.process_complaint_text(text, address_hint=location_hint)}


@router.post("/voice-process")
def process_voice_complaint(payload: VoiceProcessPayload) -> Dict[str, Any]:
    """
    Automatic Multilingual Speech & Voice Processing Endpoint:
    Accepts raw spoken audio transcript in Telugu, Hindi, Tenglish, Hinglish, or English.
    Automatically detects language, translates to standard English, and extracts core entities.
    """
    result = nlp_service.process_complaint_text(payload.spoken_text, address_hint=payload.location_hint or "")
    return {
        "success": True,
        "data": result
    }


@router.post("/chat")
def ai_assistant_chat(
    query: str = Form(...),
    history: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    AI Municipal Operations Copilot:
    Answers any questions about civic grievances, specific complaint tickets, ward densities,
    SLA response times, department heads, predictive risk forecasts, and city operations using
    Google Gemini and Groq LLMs with live database grounding and conversation history context.
    """
    parsed_history = []
    if history:
        try:
            parsed_history = json.loads(history)
        except Exception:
            pass
    return llm_service.generate_copilot_response(query=query, db=db, conversation_history=parsed_history)
