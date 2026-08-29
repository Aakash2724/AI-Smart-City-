from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
import hashlib
import os
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.models.db_models import User, UserRole, MunicipalityHead
from app.models.schemas import UserRegisterSchema, UserLoginSchema, UserResponseSchema, AuthTokenSchema, MunicipalityHeadSchema, UserProfileUpdateSchema
from app.services.municipality_service import municipality_service

router = APIRouter(prefix="/auth", tags=["Authentication & Officers"])

class ApiKeysPayload(BaseModel):
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None

import re

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def validate_password_strength(password: str) -> None:
    """
    Validates password complexity:
    - Minimum 8 characters
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one numeric digit (0-9)
    - At least one special character (!@#$%^&* etc.)
    """
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter (A-Z)."
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter (a-z)."
        )
    if not re.search(r"[0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one numeric digit (0-9)."
        )
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+~`'/\\\[\]]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character (!@#$%^&* etc.)."
        )

@router.post("/register", response_model=AuthTokenSchema, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegisterSchema, db: Session = Depends(get_db)):
    """
    Registers a new citizen with full name, email, strong password, and residential location / ward.
    """
    clean_email = user_in.email.lower().strip()
    
    # Enforce password strength rules
    if user_in.password and user_in.password != "google-oauth-authenticated":
        validate_password_strength(user_in.password)

    existing = db.query(User).filter(User.email.ilike(clean_email)).first()
    
    if existing:
        # Update existing record with the new registration details
        if user_in.name:
            existing.name = user_in.name.strip()
        if user_in.password:
            existing.password_hash = hash_password(user_in.password)
        if user_in.phone:
            existing.phone = user_in.phone.strip()
        if user_in.location:
            existing.registered_location = user_in.location.strip()
        if user_in.ward:
            existing.ward = user_in.ward.strip()
        db.commit()
        db.refresh(existing)
        token_str = f"mock-jwt-token-{existing.id}"
        return AuthTokenSchema(
            access_token=token_str,
            user=UserResponseSchema.from_orm(existing)
        )

    new_user = User(
        name=user_in.name.strip() if user_in.name else clean_email.split("@")[0].capitalize(),
        email=clean_email,
        password_hash=hash_password(user_in.password) if user_in.password else None,
        phone=user_in.phone.strip() if user_in.phone else None,
        registered_location=user_in.location or "Ward 12 - Jubilee Zone",
        ward=user_in.ward or "Ward 12",
        role=UserRole.CITIZEN.value
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_str = f"mock-jwt-token-{new_user.id}"
    return AuthTokenSchema(
        access_token=token_str,
        user=UserResponseSchema.from_orm(new_user)
    )

@router.post("/login", response_model=AuthTokenSchema)
def login_user(user_in: UserLoginSchema, db: Session = Depends(get_db)):
    """
    Authenticates a registered user with verified email and password.
    """
    clean_email = user_in.email.lower().strip()
    user = db.query(User).filter(User.email.ilike(clean_email)).first()

    # Google OAuth bypass for authenticated Google logins
    if user_in.password == "google-oauth-authenticated":
        if not user:
            user = User(
                name=clean_email.split("@")[0].capitalize(),
                email=clean_email,
                password_hash=None,
                registered_location="Ward 12 - Jubilee Zone",
                ward="Ward 12",
                role=UserRole.CITY_ADMIN.value if ("admin" in clean_email or "ghmc" in clean_email) else UserRole.CITIZEN.value
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        token_str = f"mock-jwt-token-{user.id}"
        return AuthTokenSchema(
            access_token=token_str,
            user=UserResponseSchema.from_orm(user)
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please create an account or verify your email address."
        )

    if user.password_hash:
        if user.password_hash != hash_password(user_in.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please try again."
            )

    token_str = f"mock-jwt-token-{user.id}"
    return AuthTokenSchema(
        access_token=token_str,
        user=UserResponseSchema.from_orm(user)
    )

@router.put("/profile", response_model=UserResponseSchema)
@router.post("/profile", response_model=UserResponseSchema)
def update_user_profile(payload: UserProfileUpdateSchema, db: Session = Depends(get_db)):
    """
    Updates citizen or administrator profile (name, phone, ward, address, photo) uniquely keyed by email address.
    """
    clean_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email.ilike(clean_email)).first()
    
    if not user:
        user = User(
            name=payload.name.strip() if payload.name else clean_email.split("@")[0].capitalize(),
            email=clean_email,
            phone=payload.phone.strip() if payload.phone else None,
            registered_location=payload.registered_location.strip() if payload.registered_location else "Ward 12 - Jubilee Zone",
            ward=payload.ward.strip() if payload.ward else "Ward 12",
            photo_url=payload.photo_url,
            role=UserRole.CITIZEN.value
        )
        db.add(user)
    else:
        if payload.name is not None and payload.name.strip():
            user.name = payload.name.strip()
        if payload.phone is not None:
            user.phone = payload.phone.strip()
        if payload.registered_location is not None and payload.registered_location.strip():
            user.registered_location = payload.registered_location.strip()
        if payload.ward is not None and payload.ward.strip():
            user.ward = payload.ward.strip()
        if payload.photo_url is not None:
            user.photo_url = payload.photo_url

    db.commit()
    db.refresh(user)
    return UserResponseSchema.from_orm(user)

@router.get("/me", response_model=UserResponseSchema)
def get_current_user(email: str, db: Session = Depends(get_db)):
    clean_email = email.lower().strip()
    user = db.query(User).filter(User.email.ilike(clean_email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponseSchema.from_orm(user)

@router.get("/municipality-heads", response_model=List[MunicipalityHeadSchema])
def get_municipality_heads(db: Session = Depends(get_db)):
    """Retrieves all registered Municipality Heads across city wards."""
    return municipality_service.list_all_heads(db)

@router.post("/api-keys")
def set_api_keys(payload: ApiKeysPayload):
    """
    Allows the user/administrator to securely submit Groq or Gemini API keys for Vision & LLM agents.
    """
    if payload.groq_api_key is not None:
        settings.GROQ_API_KEY = payload.groq_api_key.strip()
        os.environ["GROQ_API_KEY"] = payload.groq_api_key.strip()
    if payload.gemini_api_key is not None:
        settings.GEMINI_API_KEY = payload.gemini_api_key.strip()
        os.environ["GEMINI_API_KEY"] = payload.gemini_api_key.strip()

    return {
        "status": "success",
        "message": "AI Vision & LLM Agent API keys successfully configured!",
        "has_groq": bool(settings.GROQ_API_KEY),
        "has_gemini": bool(settings.GEMINI_API_KEY)
    }

@router.get("/api-keys")
def get_api_keys_status():
    """Returns whether Groq or Gemini Vision keys are active."""
    return {
        "has_groq": bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 5),
        "has_gemini": bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5),
        "groq_masked": f"{settings.GROQ_API_KEY[:6]}...{settings.GROQ_API_KEY[-4:]}" if settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 10 else "",
        "gemini_masked": f"{settings.GEMINI_API_KEY[:6]}...{settings.GEMINI_API_KEY[-4:]}" if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 10 else ""
    }

class SmtpSettingsPayload(BaseModel):
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_name: Optional[str] = None

class SmtpTestPayload(BaseModel):
    to_email: str

@router.get("/smtp-settings")
def get_smtp_status():
    """Returns the current Email API & SMTP status."""
    from app.services.email_service import email_service
    resend_key = os.getenv("RESEND_API_KEY", settings.RESEND_API_KEY).strip()
    user_masked = f"{email_service.smtp_user[:3]}...@{email_service.smtp_user.split('@')[1]}" if "@" in email_service.smtp_user else ("Configured" if email_service.smtp_user else "")
    return {
        "is_configured": email_service.is_configured or bool(resend_key and len(resend_key) > 5),
        "has_resend": bool(resend_key and len(resend_key) > 5),
        "smtp_server": email_service.smtp_server,
        "smtp_port": email_service.smtp_port,
        "smtp_user_masked": user_masked,
        "smtp_from_name": email_service.smtp_from_name
    }

@router.post("/smtp-settings")
def update_smtp_settings(payload: SmtpSettingsPayload):
    """Updates SMTP Simple Mail Transfer Protocol credentials in the active environment."""
    from app.services.email_service import email_service
    if payload.smtp_server:
        settings.SMTP_SERVER = payload.smtp_server.strip()
        os.environ["SMTP_SERVER"] = payload.smtp_server.strip()
    if payload.smtp_port:
        settings.SMTP_PORT = payload.smtp_port
        os.environ["SMTP_PORT"] = str(payload.smtp_port)
    if payload.smtp_user is not None:
        settings.SMTP_USER = payload.smtp_user.strip()
        os.environ["SMTP_USER"] = payload.smtp_user.strip()
    if payload.smtp_password is not None:
        clean_pwd = payload.smtp_password.strip().strip('"').strip("'")
        settings.SMTP_PASSWORD = clean_pwd
        os.environ["SMTP_PASSWORD"] = clean_pwd
    if payload.smtp_from_name:
        settings.SMTP_FROM_NAME = payload.smtp_from_name.strip()
        os.environ["SMTP_FROM_NAME"] = payload.smtp_from_name.strip()

    test_res = email_service.test_smtp_connection()
    return {
        "status": "success",
        "message": "SMTP settings updated successfully!",
        "connection_test": test_res
    }

@router.post("/smtp-test")
def test_smtp_email(payload: SmtpTestPayload):
    """Dispatches an official test grievance email via SMTP to the specified email."""
    from app.services.email_service import email_service
    sample_head = {
        "name": "Dr. Rajesh V. Sharma",
        "designation": "Chief Municipal Commissioner & Public Infrastructure Head",
        "department_name": "Roads & Infrastructure Department",
        "contact_email": "commissioner.sharma@smartcity.gov",
        "contact_phone": "+91 98765 43210",
        "office_address": "Municipal Headquarters, City Secretariat"
    }

    success = email_service.send_feedback_email(
        to_email=payload.to_email,
        ticket_number="CMP-TEST-SMTP",
        issue_category="Roads & Infrastructure",
        public_agent_msg="• Identified Road Defect & Pothole (98% confidence)\n• Bounding box annotations created and verified by Vision Engine.",
        gov_agent_msg="Official Work Order #WO-TEST-SMTP dispatched to Roads & Infrastructure mobile maintenance unit. Target SLA: Within 12 Hours.",
        municipality_head_info=sample_head,
        original_text="Test SMTP dispatch from SmartGov AI Portal",
        address="Jubilee Hills, Ward 12, Hyderabad",
        priority="HIGH",
        estimated_sla_hours=12.0
    )

    return {
        "success": success,
        "recipient": payload.to_email,
        "message": f"SMTP email successfully sent to {payload.to_email}!" if success else f"Failed to send email to {payload.to_email}. Please check SMTP credentials in .env"
    }

