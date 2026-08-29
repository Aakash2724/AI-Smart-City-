from typing import TypedDict, List, Dict, Any, Optional

class ComplaintState(TypedDict):
    complaint_id: str
    original_text: str
    latitude: float
    longitude: float
    address: str
    image_url: Optional[str]
    
    # Processed NLP & CV Inputs
    vision_detections: List[Dict[str, Any]]
    nlp_data: Dict[str, Any]
    
    # Agent Outputs
    category: str
    subcategory: str
    priority: str
    priority_score: int
    priority_breakdown: Dict[str, Any]
    assigned_department_id: Optional[str]
    assigned_department_name: str
    estimated_resolution_hours: float
    citizen_response: str
    
    # Observability Logs
    agent_logs: List[Dict[str, Any]]
