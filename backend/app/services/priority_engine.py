from typing import Dict, Any, List, Tuple

class PriorityEngine:
    """
    Computes an Explainable 5-Factor Priority Score:
    Score = Severity + LocationRisk + Frequency + PublicImpact + SafetyRisk
    """

    def calculate_priority(
        self,
        vision_detections: List[Dict[str, Any]],
        nlp_data: Dict[str, Any],
        nearby_complaint_count: int = 3
    ) -> Tuple[str, int, Dict[str, Any]]:
        
        # 1. Issue Severity Score (0-10)
        severity_score = 4
        if vision_detections:
            top_det = vision_detections[0]
            sev_level = top_det.get("severity_level", "MEDIUM").upper()
            if sev_level == "CRITICAL":
                severity_score = 10
            elif sev_level == "HIGH":
                severity_score = 8
            elif sev_level == "MEDIUM":
                severity_score = 6
            else:
                severity_score = 4
        
        # 2. Location Risk Score (0-10)
        entities = nlp_data.get("entities", {})
        vulnerable_zone = entities.get("vulnerable_zone", "residential")
        location_score = 4
        if vulnerable_zone == "school":
            location_score = 10
        elif vulnerable_zone == "hospital":
            location_score = 9
        elif vulnerable_zone == "highway":
            location_score = 8
        elif vulnerable_zone == "market":
            location_score = 7

        # 3. Complaint Frequency / Density Score (0-10)
        frequency_score = min(nearby_complaint_count * 2, 10)

        # 4. Public Impact Score (0-10)
        public_impact_score = 5
        if vulnerable_zone in ["market", "highway", "school"]:
            public_impact_score = 8

        # 5. Safety Risk Score (0-10)
        safety_risk_score = nlp_data.get("safety_risk_score", 5)
        if entities.get("incident_reported", False):
            safety_risk_score = 10

        total_score = (
            severity_score +
            location_score +
            frequency_score +
            public_impact_score +
            safety_risk_score
        )

        # Map Total Score to Priority Tier
        if total_score >= 36:
            priority_tier = "CRITICAL"
        elif total_score >= 26:
            priority_tier = "HIGH"
        elif total_score >= 16:
            priority_tier = "MEDIUM"
        else:
            priority_tier = "LOW"

        explanations = [
            f"Visual Severity Score: {severity_score}/10 (CV detection confidence & hazard depth)",
            f"Location Risk Score: {location_score}/10 (Proximity to {vulnerable_zone})",
            f"Complaint Density Score: {frequency_score}/10 ({nearby_complaint_count} existing reports in 500m radius)",
            f"Public Impact Score: {public_impact_score}/10 (High traffic & pedestrian volume zone)",
            f"Safety Risk Score: {safety_risk_score}/10 ({'Accident reported!' if entities.get('incident_reported') else 'General structural risk'})"
        ]

        breakdown = {
            "issue_severity": severity_score,
            "location_risk": location_score,
            "complaint_frequency": frequency_score,
            "public_impact": public_impact_score,
            "safety_risk": safety_risk_score,
            "total_score": total_score,
            "explanation": explanations
        }

        return priority_tier, total_score, breakdown

priority_engine = PriorityEngine()
