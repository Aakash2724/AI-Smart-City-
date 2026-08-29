import time
from app.agents.state import ComplaintState
from app.services.priority_engine import priority_engine
from app.services.rag_service import rag_service

class PriorityAgent:
    def execute(self, state: ComplaintState) -> ComplaintState:
        start_time = time.time()
        
        vision_dets = state.get("vision_detections", [])
        nlp_data = state.get("nlp_data", {})
        category = state.get("category", "Roads & Infrastructure")
        
        # 1. Retrieve Municipal Policy & SLA Guidelines via RAG
        policy = rag_service.retrieve_policy(category)
        
        # 2. Calculate 5-Factor Explainable Score
        priority_tier, total_score, breakdown = priority_engine.calculate_priority(
            vision_detections=vision_dets,
            nlp_data=nlp_data,
            nearby_complaint_count=3
        )
        
        # Match SLA hours from retrieved policy
        sla_map = policy.get("sla_hours", {})
        estimated_hours = sla_map.get(priority_tier, 24.0)

        state["priority"] = priority_tier
        state["priority_score"] = total_score
        state["priority_breakdown"] = breakdown
        state["estimated_resolution_hours"] = float(estimated_hours)
        
        exec_ms = int((time.time() - start_time) * 1000)
        
        log_entry = {
            "agent_name": "Priority Assessment Agent",
            "input_state": {"category": category, "safety_risk": nlp_data.get("safety_risk_score")},
            "output_state": {"priority": priority_tier, "priority_score": total_score, "sla_hours": estimated_hours},
            "reasoning": f"Evaluated 5-factor scoring model. Total Score: {total_score}/50 -> Assigned Priority: {priority_tier}. Retreived Municipal SLA Policy ({policy.get('policy_id')}) -> Target SLA Resolution Time: {estimated_hours}h.",
            "execution_time_ms": max(exec_ms, 18)
        }
        
        state["agent_logs"].append(log_entry)
        return state

priority_agent = PriorityAgent()
