from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class UserRegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    location: Optional[str] = "Ward 12 - Jubilee Zone"
    ward: Optional[str] = "Ward 12"

class UserLoginSchema(BaseModel):
    email: str
    password: str

class UserProfileUpdateSchema(BaseModel):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    registered_location: Optional[str] = None
    ward: Optional[str] = None
    photo_url: Optional[str] = None

class UserResponseSchema(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    registered_location: str
    ward: str
    role: str
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True

class AuthTokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponseSchema

class MunicipalityHeadSchema(BaseModel):
    id: str
    name: str
    designation: str
    department_name: str
    assigned_ward: str
    photo_url: str
    contact_email: str
    contact_phone: Optional[str] = None
    office_address: Optional[str] = None

    class Config:
        from_attributes = True

class VisionDetectionSchema(BaseModel):
    id: Optional[str] = None
    detected_class: str
    confidence: float
    severity_level: str
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    annotated_image_url: Optional[str] = None
    img_width: Optional[int] = None
    img_height: Optional[int] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None

    class Config:
        from_attributes = True

class AgentExecutionLogSchema(BaseModel):
    id: Optional[str] = None
    agent_name: str
    input_state: Optional[Dict[str, Any]] = None
    output_state: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = None
    execution_time_ms: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PriorityBreakdownSchema(BaseModel):
    issue_severity: int
    location_risk: int
    complaint_frequency: int
    public_impact: int
    safety_risk: int
    total_score: int
    explanation: List[str]

class ComplaintCreateSchema(BaseModel):
    original_text: str
    latitude: float
    longitude: float
    address: Optional[str] = "Main Street, City Ward 12"
    language: Optional[str] = "Auto-Detect"
    citizen_name: Optional[str] = "Anonymous Citizen"
    registered_email: Optional[str] = "citizen@smartcity.gov"

class ComplaintResponseSchema(BaseModel):
    id: str
    ticket_number: str
    registered_email: Optional[str] = None
    citizen_name: Optional[str] = None
    original_text: str
    detected_language: str
    translated_text: Optional[str] = None
    summary: Optional[str] = None
    public_agent_response: Optional[str] = None
    gov_agent_response: Optional[str] = None
    image_url: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    ward: Optional[str] = None
    category: str
    subcategory: str
    status: str
    priority: str
    priority_score: int
    priority_breakdown: Optional[Dict[str, Any]] = None
    estimated_resolution_hours: float
    assigned_department_name: Optional[str] = None
    assigned_department_id: Optional[str] = None
    municipality_head: Optional[MunicipalityHeadSchema] = None
    email_feedback_sent: Optional[int] = 1
    created_at: datetime
    vision_detections: List[VisionDetectionSchema] = []
    agent_logs: List[AgentExecutionLogSchema] = []

    class Config:
        from_attributes = True

class PredictiveHotspotSchema(BaseModel):
    id: str
    zone_name: str
    latitude: float
    longitude: float
    predicted_category: str
    predicted_incident_count: int
    risk_score: float
    forecast_date: str
    recommended_action: Optional[str] = None

class AnalyticsSummarySchema(BaseModel):
    total_complaints: int
    resolved_complaints: int
    critical_complaints: int
    avg_response_hours: float
    category_counts: Dict[str, int]
    department_workload: List[Dict[str, Any]]
    weekly_trends: List[Dict[str, Any]]

