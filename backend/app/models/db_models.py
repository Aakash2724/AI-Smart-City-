import uuid
import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    DEPARTMENT_OFFICER = "DEPARTMENT_OFFICER"
    CITY_ADMIN = "CITY_ADMIN"

class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class PriorityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(20), nullable=False, unique=True)
    contact_email = Column(String(100), nullable=False)
    active_headcount = Column(Integer, default=15)
    current_workload = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaints = relationship("Complaint", back_populates="department")

class MunicipalityHead(Base):
    __tablename__ = "municipality_heads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    designation = Column(String(100), nullable=False)
    department_name = Column(String(100), nullable=False)
    assigned_ward = Column(String(100), nullable=False)  # e.g., "Ward 12 - Jubilee Zone"
    photo_url = Column(String(255), nullable=False)
    contact_email = Column(String(100), nullable=False)
    contact_phone = Column(String(30), nullable=True)
    office_address = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaints = relationship("Complaint", back_populates="municipality_head")

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    registered_location = Column(String(255), default="Jubilee Zone, Ward 12")
    ward = Column(String(100), default="Ward 12")
    role = Column(String(30), default=UserRole.CITIZEN.value)
    photo_url = Column(Text, nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaints = relationship("Complaint", back_populates="citizen")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = Column(String(30), nullable=False, unique=True)
    citizen_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    registered_email = Column(String(100), nullable=True)
    
    # Text Inputs & Processing Results
    original_text = Column(Text, nullable=False)
    detected_language = Column(String(20), default="English")
    translated_text = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    
    # Dual Agent Outputs
    public_agent_response = Column(Text, nullable=True)  # Visible Citizen AI Text Agent Box
    gov_agent_response = Column(Text, nullable=True)     # Hidden Government AI Agent official answer
    
    # Media & Location
    image_url = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=True)
    ward = Column(String(50), default="Ward 12")
    
    # Categorization & Routing
    category = Column(String(50), default="General Civic Issue")
    subcategory = Column(String(50), default="Unclassified")
    status = Column(String(30), default=ComplaintStatus.SUBMITTED.value)
    
    # Explainable Priority Score & SLA
    priority = Column(String(20), default=PriorityLevel.MEDIUM.value)
    priority_score = Column(Integer, default=20)
    priority_breakdown = Column(JSON, nullable=True)
    estimated_resolution_hours = Column(Float, default=24.0)
    
    assigned_department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    municipality_head_id = Column(String(36), ForeignKey("municipality_heads.id"), nullable=True)
    email_feedback_sent = Column(Integer, default=1) # 1 = Sent, 0 = Pending
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    citizen = relationship("User", back_populates="complaints")
    department = relationship("Department", back_populates="complaints")
    municipality_head = relationship("MunicipalityHead", back_populates="complaints")
    vision_detections = relationship("VisionDetection", back_populates="complaint", cascade="all, delete-orphan")
    agent_logs = relationship("AgentExecutionLog", back_populates="complaint", cascade="all, delete-orphan")

class VisionDetection(Base):
    __tablename__ = "vision_detections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String(36), ForeignKey("complaints.id"), nullable=False)
    detected_class = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    severity_level = Column(String(20), default="medium")
    bounding_boxes = Column(JSON, nullable=True)
    annotated_image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="vision_detections")

class AgentExecutionLog(Base):
    __tablename__ = "agent_execution_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String(36), ForeignKey("complaints.id"), nullable=False)
    agent_name = Column(String(50), nullable=False)
    input_state = Column(JSON, nullable=True)
    output_state = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="agent_logs")

class PredictiveHotspot(Base):
    __tablename__ = "predictive_hotspots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    predicted_category = Column(String(50), nullable=False)
    predicted_incident_count = Column(Integer, default=5)
    risk_score = Column(Float, default=0.75)  # 0.0 to 1.0
    forecast_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    recommended_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

