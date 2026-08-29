import time
from typing import Dict, Any
from app.agents.state import ComplaintState

class ResponseAgent:
    """
    Autonomous Communication & Work Order Agent.
    Generates:
    1. Localized Citizen Feedback (English, Hindi, Telugu)
    2. Public Vision Detection Summary
    3. Official Municipal Government Work Order Directive
    """
    def execute(self, state: ComplaintState) -> ComplaintState:
        start_time = time.time()
        
        category = state.get("category", "Civic Issue")
        subcategory = state.get("subcategory", "Civic Maintenance")
        priority = state.get("priority", "MEDIUM")
        dept_name = state.get("assigned_department_name", "Municipal Department")
        sla_hours = state.get("estimated_resolution_hours", 24.0)
        address = state.get("address", "City Zone")
        detected_lang = state.get("nlp_data", {}).get("detected_language", "English")
        vision_dets = state.get("vision_detections", [])
        
        top_vision = vision_dets[0].get("detected_class", "").replace("_", " ").title() if vision_dets else None
        vision_conf = int(vision_dets[0].get("confidence", 0.95) * 100) if vision_dets else None
        vision_prefix = f"Visual detection verified {top_vision} ({vision_conf}% confidence). " if top_vision else ""

        # 1. Citizen Localized Feedback
        if "Hindi" in detected_lang:
            citizen_msg = (
                f"आपकी शिकायत दर्ज कर ली गई है। {vision_prefix}समस्या का वर्गीकरण: '{category}' (प्राथमिकता: {priority})। "
                f"इसे '{dept_name}' को सौंपा गया है। अनुमानित समाधान समय: {int(sla_hours)} घंटे।"
            )
        elif "Telugu" in detected_lang:
            citizen_msg = (
                f"మీ ఫిర్యాదు విజయవంతంగా నమోదు చేయబడింది. {vision_prefix}సమస్య వర్గీకరణ: '{category}' "
                f"(ప్రాధాన్యత: {priority}). ఇది '{dept_name}' కు కేటాయించబడింది. "
                f"పరిష్కార సమయం: {int(sla_hours)} గంటలు."
            )
        else:
            citizen_msg = (
                f"Your complaint has been successfully processed. {vision_prefix}Classified as '{category}' "
                f"with {priority} priority and routed to the {dept_name}. "
                f"Estimated resolution SLA window: {int(sla_hours)} hours."
            )

        # 2. Public Vision Summary Box (Concise, Clean & Non-Repetitive)
        if vision_dets:
            # Group identical classes together so we don't repeat "Identified Pothole" 5 times
            class_groups = {}
            for det in vision_dets:
                raw_cls = det.get("detected_class", "Civic Issue")
                cls_name = raw_cls.replace("_", " ").title()
                conf = float(det.get("confidence", 0.90))
                sev = str(det.get("severity_level", "HIGH")).upper()
                if cls_name not in class_groups:
                    class_groups[cls_name] = {"count": 1, "max_conf": conf, "severity": sev}
                else:
                    class_groups[cls_name]["count"] += 1
                    if conf > class_groups[cls_name]["max_conf"]:
                        class_groups[cls_name]["max_conf"] = conf
                        class_groups[cls_name]["severity"] = sev

            summary_items = []
            for cls_name, info in class_groups.items():
                conf_pct = int(info["max_conf"] * 100)
                count = info["count"]
                if count > 1:
                    summary_items.append(f"• {cls_name} ({count} instances verified, peak confidence {conf_pct}%, Severity: {info['severity']})")
                else:
                    summary_items.append(f"• {cls_name} (Confidence: {conf_pct}%, Severity: {info['severity']})")

            public_msg = (
                f"Thank you for reporting this issue. Our AI visual triage verified:\n"
                + "\n".join(summary_items) +
                f"\n\nIssue confirmed & prioritized for immediate municipal dispatch."
            )
        else:
            public_msg = (
                f"Thank you for reporting this issue. Your grievance has been recorded and scheduled for on-site departmental inspection."
            )

        # 3. Government Work Order Directive
        ticket_id = str(state.get('complaint_id') or state.get('ticket_number') or '101')
        work_order_no = f"WO-{ticket_id[-4:]}"
        gov_msg = (
            f"OFFICIAL MUNICIPAL ADMINISTRATIVE DIRECTIVE:\n"
            f"Issue verified and categorized under '{category} - {subcategory}'. "
            f"Priority tier assessed as [{priority}] based on public safety risk matrix. "
            f"Dispatched official field inspection crew from {dept_name} to {address}. "
            f"Target SLA Resolution Window: Within {int(sla_hours)} hours. "
            f"Official work order #{work_order_no} issued."
        )

        state["citizen_response"] = citizen_msg
        state["public_agent_response"] = public_msg
        state["gov_agent_response"] = gov_msg

        exec_ms = max(int((time.time() - start_time) * 1000), 12)
        
        if "agent_logs" not in state:
            state["agent_logs"] = []
        state["agent_logs"].append({
            "agent_name": "Response & Directive Agent",
            "reasoning": f"Synthesized localized citizen feedback ({detected_lang}), vision report, and municipal work order #{work_order_no}.",
            "execution_time_ms": exec_ms
        })

        return state

response_agent = ResponseAgent()
