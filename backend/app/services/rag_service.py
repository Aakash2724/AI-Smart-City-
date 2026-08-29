from typing import Dict, Any, List

MUNICIPAL_POLICIES = [
    {
        "category": "Roads & Infrastructure",
        "policy_id": "POL-RD-2026",
        "sla_hours": {"CRITICAL": 4, "HIGH": 12, "MEDIUM": 24, "LOW": 72},
        "description": "Emergency pothole repair policy: Road defects within 200m of educational institutions or major arterial roads must be treated as CRITICAL priority and patched within 4 hours.",
        "responsible_department": "Roads & Infrastructure Department"
    },
    {
        "category": "Sanitation & Waste",
        "policy_id": "POL-SAN-2026",
        "sla_hours": {"CRITICAL": 6, "HIGH": 12, "MEDIUM": 24, "LOW": 48},
        "description": "Waste clearance guidelines: Overflowing dumpsters in commercial areas or near food markets require immediate dispatch within 6 hours.",
        "responsible_department": "Sanitation & Waste Management"
    },
    {
        "category": "Water & Sewage",
        "policy_id": "POL-WTR-2026",
        "sla_hours": {"CRITICAL": 3, "HIGH": 8, "MEDIUM": 18, "LOW": 48},
        "description": "Water leakage and pipe burst escalation protocol: Main line water contamination or active flooding must be mitigated within 3 hours.",
        "responsible_department": "Water Supply & Sewage Board"
    },
    {
        "category": "Electrical & Power",
        "policy_id": "POL-ELE-2026",
        "sla_hours": {"CRITICAL": 2, "HIGH": 6, "MEDIUM": 12, "LOW": 36},
        "description": "Public lighting safety standard: Exposed electrical wires or blackout in high-crime zones require emergency dispatch within 2 hours.",
        "responsible_department": "Electrical & Power Department"
    }
]

class RAGService:
    def retrieve_policy(self, category: str, keywords: str = "") -> Dict[str, Any]:
        """Retrieves relevant municipal policy document and SLA guideline."""
        category_lower = category.lower()
        for pol in MUNICIPAL_POLICIES:
            if pol["category"].lower() in category_lower or category_lower in pol["category"].lower():
                return pol
        return MUNICIPAL_POLICIES[0]

rag_service = RAGService()
