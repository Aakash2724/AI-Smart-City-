from sqlalchemy.orm import Session
from app.models.db_models import MunicipalityHead
from typing import Optional, List, Dict, Any

CANONICAL_OFFICERS = {
    "Sanitation & Waste": {
        "name": "Mr. Nandamuri Taraka Rama Rao Jr",
        "designation": "Director of Sanitation & Urban Environmental Safety",
        "department_name": "Sanitation & Waste Management Board",
        "assigned_ward": "Ward 8 - Central Market Zone",
        "photo_url": "/images/heads/ntr.jpg",
        "contact_email": "director.ntr@smartcity.gov",
        "contact_phone": "+91 98765 43211",
        "office_address": "Clean City Complex, Ward 8 Office"
    },
    "Water & Sewage": {
        "name": "Mr. Ram Charan Tej Konidela",
        "designation": "Chief Executive Water Engineer",
        "department_name": "Water Supply & Sewage Board",
        "assigned_ward": "Ward 14 - Green Park Zone",
        "photo_url": "/images/heads/ramcharan.jpg",
        "contact_email": "chief.ramcharan@smartcity.gov",
        "contact_phone": "+91 98765 43212",
        "office_address": "Hydro Works Building, Ward 14"
    },
    "Electrical & Power": {
        "name": "Dr. Allu Arjun",
        "designation": "Commissioner of Electrical Grid & Smart Lighting",
        "department_name": "Electrical & Power Grid Department",
        "assigned_ward": "Ward 15 - IT Corridor Zone",
        "photo_url": "/images/heads/alluarjun.jpg",
        "contact_email": "commissioner.allu@smartcity.gov",
        "contact_phone": "+91 98765 43213",
        "office_address": "Power House Tower, Cyber District"
    },
    "Traffic & Safety": {
        "name": "Mr. Mahesh Babu Ghattamaneni",
        "designation": "Director General of Urban Transit & Traffic Regulation",
        "department_name": "Traffic Enforcement & Safety Division",
        "assigned_ward": "Ward 4 - Old City Zone",
        "photo_url": "/images/heads/maheshbabu.jpg",
        "contact_email": "director.mahesh@smartcity.gov",
        "contact_phone": "+91 98765 43214",
        "office_address": "Traffic Command Center, Central HQ"
    },
    "Roads & Infrastructure": {
        "name": "Dr. Uppalapati Venkata Suryanarayana Prabhas Raju",
        "designation": "Chief Municipal Commissioner & Public Infrastructure Head",
        "department_name": "Roads & Infrastructure Department",
        "assigned_ward": "Ward 12 - Jubilee Zone",
        "photo_url": "/images/heads/prabhas.jpg",
        "contact_email": "commissioner.prabhas@smartcity.gov",
        "contact_phone": "+91 98765 43210",
        "office_address": "Municipal Headquarters, Block A, City Secretariat"
    }
}

class MunicipalityService:
    def get_head_by_location(self, db: Session, location_text: str = "", ward_text: str = "", category: str = "") -> Optional[MunicipalityHead]:
        """
        Lookup the Municipality Head based on issue category, registered citizen location, and complaint ward.
        Priority is given to category-matched department officer.
        """
        cat_lower = (category or "").lower()
        
        # 1. Match by Exact Issue Category Department
        matched_head = None
        if "sanitation" in cat_lower or "waste" in cat_lower or "garbage" in cat_lower:
            matched_head = db.query(MunicipalityHead).filter(
                (MunicipalityHead.department_name.ilike("%Sanitation%")) | 
                (MunicipalityHead.name.ilike("%Nandamuri%")) |
                (MunicipalityHead.name.ilike("%Rama Rao%"))
            ).first()
            if not matched_head:
                canon = CANONICAL_OFFICERS["Sanitation & Waste"]
                return self._create_or_get_fallback(db, canon)
            return matched_head

        if "water" in cat_lower or "sewage" in cat_lower or "drain" in cat_lower:
            matched_head = db.query(MunicipalityHead).filter(
                (MunicipalityHead.department_name.ilike("%Water%")) | 
                (MunicipalityHead.name.ilike("%Ram Charan%"))
            ).first()
            if not matched_head:
                canon = CANONICAL_OFFICERS["Water & Sewage"]
                return self._create_or_get_fallback(db, canon)
            return matched_head

        if "electrical" in cat_lower or "power" in cat_lower or "light" in cat_lower:
            matched_head = db.query(MunicipalityHead).filter(
                (MunicipalityHead.department_name.ilike("%Electrical%")) | 
                (MunicipalityHead.name.ilike("%Allu Arjun%"))
            ).first()
            if not matched_head:
                canon = CANONICAL_OFFICERS["Electrical & Power"]
                return self._create_or_get_fallback(db, canon)
            return matched_head

        if "traffic" in cat_lower or "safety" in cat_lower or "parking" in cat_lower:
            matched_head = db.query(MunicipalityHead).filter(
                (MunicipalityHead.department_name.ilike("%Traffic%")) | 
                (MunicipalityHead.name.ilike("%Mahesh%"))
            ).first()
            if not matched_head:
                canon = CANONICAL_OFFICERS["Traffic & Safety"]
                return self._create_or_get_fallback(db, canon)
            return matched_head

        # Roads / Default
        matched_head = db.query(MunicipalityHead).filter(
            (MunicipalityHead.department_name.ilike("%Road%")) | 
            (MunicipalityHead.name.ilike("%Prabhas%"))
        ).first()
        if not matched_head:
            canon = CANONICAL_OFFICERS["Roads & Infrastructure"]
            return self._create_or_get_fallback(db, canon)
        return matched_head

    def _create_or_get_fallback(self, db: Session, canon: Dict[str, Any]) -> MunicipalityHead:
        existing = db.query(MunicipalityHead).filter(MunicipalityHead.contact_email == canon["contact_email"]).first()
        if existing:
            return existing
        new_head = MunicipalityHead(
            name=canon["name"],
            designation=canon["designation"],
            department_name=canon["department_name"],
            assigned_ward=canon["assigned_ward"],
            photo_url=canon["photo_url"],
            contact_email=canon["contact_email"],
            contact_phone=canon["contact_phone"],
            office_address=canon["office_address"]
        )
        try:
            db.add(new_head)
            db.commit()
            db.refresh(new_head)
            return new_head
        except Exception:
            db.rollback()
            return new_head

    def list_all_heads(self, db: Session) -> List[MunicipalityHead]:
        return db.query(MunicipalityHead).all()

municipality_service = MunicipalityService()
