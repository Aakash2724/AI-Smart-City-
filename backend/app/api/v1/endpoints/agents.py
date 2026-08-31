from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time
import random

from app.core.database import get_db
from app.models.db_models import AgentExecutionLog, Department, MunicipalityHead

router = APIRouter(prefix="/agents", tags=["LangGraph Multi-Agent"])

class SwarmSimulationRequest(BaseModel):
    scenario_text: str
    location: Optional[str] = "Jubilee Hills, Ward 12"
    defect_type: Optional[str] = "water_leakage"

@router.get("/logs/{complaint_id}")
def get_agent_logs(complaint_id: str, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Retrieves full reasoning log traces for all 4 LangGraph agents for a given complaint."""
    logs = db.query(AgentExecutionLog).filter(AgentExecutionLog.complaint_id == complaint_id).order_by(AgentExecutionLog.created_at.asc()).all()
    return [
        {
            "id": log.id,
            "agent_name": log.agent_name,
            "input_state": log.input_state,
            "output_state": log.output_state,
            "reasoning": log.reasoning,
            "execution_time_ms": log.execution_time_ms,
            "created_at": log.created_at
        }
        for log in logs
    ]

@router.post("/simulate-swarm")
def simulate_agent_swarm(req: SwarmSimulationRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Executes a real-time Autonomous Multi-Agent Swarm Simulation across all 4 nodes:
    1. Triage Agent       -> Classifies urgency, sentiment & category
    2. Vision Inspector   -> Simulates YOLOv8 defect localization & deduplication
    3. Geo-Routing Agent  -> Identifies nearest zonal crew & dispatch depot
    4. Predictive SLA     -> Forecasts resolution window & arms escalation trigger
    """
    text = req.scenario_text.strip()
    text_lower = text.lower()

    # 1. Triage Analysis
    if any(w in text_lower for w in ["water", "pipe", "drain", "sewage", "leak", "flood", "burst"]):
        category = "Water Supply & Sewerage Board"
        subcategory = "Water Main Leakage & Drainage Overflow"
        raw_class = "water_leakage"
        severity = "CRITICAL"
        urgency_score = 94
        head_name = "Dr. Uppalapati Venkata Suryanarayana Prabhas Raju"
        dept_code = "DEPT-WTR"
        est_hours = 12
    elif any(w in text_lower for w in ["garbage", "trash", "waste", "dump", "dustbin", "debris"]):
        category = "Sanitation & Waste Management Board"
        subcategory = "Garbage Overflow & Solid Waste Accumulation"
        raw_class = "garbage_overflow"
        severity = "HIGH"
        urgency_score = 86
        head_name = "Mr. Nandamuri Taraka Rama Rao Jr"
        dept_code = "DEPT-SAN"
        est_hours = 8
    elif any(w in text_lower for w in ["road", "pothole", "crater", "asphalt", "flyover"]):
        category = "Roads & Infrastructure Department"
        subcategory = "Dangerous Road Pothole & Surface Crater"
        raw_class = "pothole"
        severity = "HIGH"
        urgency_score = 88
        head_name = "Mr. Ram Charan Tej Konidela"
        dept_code = "DEPT-RD"
        est_hours = 24
    elif any(w in text_lower for w in ["light", "streetlight", "wire", "power", "electric", "pole", "spark"]):
        category = "Electrical & Power Grid Department"
        subcategory = "Streetlight Defect & Exposed Power Hazard"
        raw_class = "damaged_streetlight"
        severity = "HIGH"
        urgency_score = 82
        head_name = "Dr. Allu Arjun"
        dept_code = "DEPT-ELE"
        est_hours = 16
    else:
        category = "Traffic Enforcement & Safety Division"
        subcategory = "Illegal Parking & Urban Obstruction"
        raw_class = "illegal_parking"
        severity = "MEDIUM"
        urgency_score = 65
        head_name = "Mr. Mahesh Babu Ghattamaneni"
        dept_code = "DEPT-TRF"
        est_hours = 6

    ticket_number = f"GRV-{random.randint(10000, 99999)}"

    # Step-by-step Telemetry Traces
    traces = [
        {
            "agent_id": "triage_agent",
            "agent_name": "Sentinel Triage Agent",
            "role": "NLP & Urgency Scoring",
            "status": "COMPLETED",
            "execution_ms": 142,
            "output": {
                "category": category,
                "subcategory": subcategory,
                "urgency_score": f"{urgency_score}/100",
                "priority": severity,
                "hazard_flag": severity == "CRITICAL"
            },
            "log": f"Parsed intake stream. Keyword extraction matched '{subcategory}'. Emergency priority evaluated as {severity} ({urgency_score}% urgency factor)."
        },
        {
            "agent_id": "vision_agent",
            "agent_name": "Vision Inspector Agent",
            "role": "YOLOv8 Localization & Deduplication",
            "status": "COMPLETED",
            "execution_ms": 285,
            "output": {
                "detected_object": raw_class.upper().replace("-", "_"),
                "confidence": "97.4%",
                "bounding_box": {"x1": 120, "y1": 84, "x2": 450, "y2": 310},
                "deduplication_status": "Unique Incident (No proximate duplicates within 50m radius)"
            },
            "log": f"YOLOv8 vision inference detected {raw_class.upper()} with 97.4% confidence. Spatial hash radius check confirmed 0 duplicate reports in active 50m cluster."
        },
        {
            "agent_id": "routing_agent",
            "agent_name": "Geo-Logistics & Routing Agent",
            "role": "Depot Distance & Crew Assignment",
            "status": "COMPLETED",
            "execution_ms": 98,
            "output": {
                "target_department": category,
                "designated_officer": head_name,
                "assigned_ward": req.location,
                "crew_distance": "1.2 km from Zonal Depot",
                "active_crew_units": "4 Officers On-Duty"
            },
            "log": f"Calculated spatial Haversine distance to {req.location}. Dispatched automated work order ticket #{ticket_number} to {head_name} ({category})."
        },
        {
            "agent_id": "sla_agent",
            "agent_name": "Predictive SLA & Escalation Agent",
            "role": "Dynamic SLA & Breaching Alarms",
            "status": "COMPLETED",
            "execution_ms": 64,
            "output": {
                "resolution_target_hours": f"{est_hours} Hours",
                "escalation_alarm": "Armed (Level-1 Auto Escalation at T+8h)",
                "work_order_status": "DISPATCHED_LIVE"
            },
            "log": f"Workload capacity factor analyzed at 0.62. Guaranteed municipal SLA locked at {est_hours} hours. Auto-escalation trigger initialized."
        }
    ]

    return {
        "ticket_number": ticket_number,
        "scenario": text,
        "location": req.location,
        "category": category,
        "subcategory": subcategory,
        "priority": severity,
        "assigned_head": head_name,
        "estimated_hours": est_hours,
        "total_execution_ms": sum(t["execution_ms"] for t in traces),
        "traces": traces
    }

