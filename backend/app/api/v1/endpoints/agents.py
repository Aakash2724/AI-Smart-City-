from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.db_models import AgentExecutionLog

router = APIRouter(prefix="/agents", tags=["LangGraph Multi-Agent"])

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
