from sqlalchemy.orm import Session
from app.models.db_models import MunicipalityHead
from typing import Optional, List, Dict, Any

class MunicipalityService:
    def get_head_by_location(self, db: Session, location_text: str = "", ward_text: str = "", category: str = "") -> Optional[MunicipalityHead]:
        """
        Lookup the Municipality Head based on issue category, registered citizen location, and complaint ward.
        Priority is given to category-matched department officer.
        """
        cat_lower = (category or "").lower()
        loc_lower = f"{location_text} {ward_text}".lower()
        
        all_heads = db.query(MunicipalityHead).all()
        if not all_heads:
            return None

        # 1. Match by Exact Issue Category Department
        if "water" in cat_lower or "sewage" in cat_lower or "drain" in cat_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.department_name.ilike("%Water%")).first()
            if head: return head

        if "sanitation" in cat_lower or "waste" in cat_lower or "garbage" in cat_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.department_name.ilike("%Sanitation%")).first()
            if head: return head

        if "electrical" in cat_lower or "power" in cat_lower or "light" in cat_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.department_name.ilike("%Electrical%")).first()
            if head: return head

        if "traffic" in cat_lower or "safety" in cat_lower or "parking" in cat_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.department_name.ilike("%Traffic%")).first()
            if head: return head

        if "road" in cat_lower or "infrastructure" in cat_lower or "pothole" in cat_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.department_name.ilike("%Roads%")).first()
            if head: return head

        # 2. Location Ward Fallback
        if "ward 14" in loc_lower or "green park" in loc_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.assigned_ward.ilike("%Ward 14%")).first()
            if head: return head

        if "ward 8" in loc_lower or "market" in loc_lower or "banjara" in loc_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.assigned_ward.ilike("%Ward 8%")).first()
            if head: return head

        if "ward 15" in loc_lower or "it corridor" in loc_lower or "cyber" in loc_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.assigned_ward.ilike("%Ward 15%")).first()
            if head: return head

        if "ward 12" in loc_lower or "jubilee" in loc_lower:
            head = db.query(MunicipalityHead).filter(MunicipalityHead.assigned_ward.ilike("%Ward 12%")).first()
            if head: return head

        # Default to Chief Commissioner
        return all_heads[0]

    def list_all_heads(self, db: Session) -> List[MunicipalityHead]:
        return db.query(MunicipalityHead).all()

municipality_service = MunicipalityService()
