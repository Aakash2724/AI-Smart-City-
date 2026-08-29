import os
import uuid
import datetime
import hashlib
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.models.db_models import Department, User, Complaint, VisionDetection, AgentExecutionLog, PredictiveHotspot, MunicipalityHead, UserRole, PriorityLevel, ComplaintStatus

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Create Default Municipal Departments
    depts_data = [
        {"name": "Roads & Infrastructure Department", "code": "DEPT-RD", "email": "roads@smartcity.gov", "headcount": 25},
        {"name": "Sanitation & Waste Management Board", "code": "DEPT-SAN", "email": "sanitation@smartcity.gov", "headcount": 30},
        {"name": "Water Supply & Sewage Board", "code": "DEPT-WTR", "email": "water@smartcity.gov", "headcount": 20},
        {"name": "Electrical & Power Grid Department", "code": "DEPT-ELE", "email": "power@smartcity.gov", "headcount": 15},
        {"name": "Traffic Enforcement & Safety Division", "code": "DEPT-TRF", "email": "traffic@smartcity.gov", "headcount": 18}
    ]

    dept_objs = {}
    for d in depts_data:
        existing = db.query(Department).filter(Department.code == d["code"]).first()
        if not existing:
            dept = Department(
                name=d["name"],
                code=d["code"],
                contact_email=d["email"],
                active_headcount=d["headcount"],
                current_workload=5
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
            dept_objs[d["code"]] = dept
        else:
            dept_objs[d["code"]] = existing

    # 2. Seed Municipality Heads
    heads_data = [
        {
            "name": "Dr. Uppalapati Venkata Suryanarayana Prabhas Raju",
            "designation": "Chief Municipal Commissioner & Public Infrastructure Head",
            "department": "Roads & Infrastructure Department",
            "ward": "Ward 12 - Jubilee Zone",
            "photo_url": "/images/heads/prabhas.jpg",
            "email": "commissioner.prabhas@smartcity.gov",
            "phone": "+91 98765 43210",
            "address": "Municipal Headquarters, Block A, City Secretariat"
        },
        {
            "name": "Mr. Nandamuri Taraka Rama Rao Jr",
            "designation": "Director of Sanitation & Urban Environmental Safety",
            "department": "Sanitation & Waste Management Board",
            "ward": "Ward 8 - Central Market Zone",
            "photo_url": "/images/heads/ntr.jpg",
            "email": "director.ntr@smartcity.gov",
            "phone": "+91 98765 43211",
            "address": "Clean City Complex, Ward 8 Office"
        },
        {
            "name": "Mr. Ram Charan Tej Konidela",
            "designation": "Chief Executive Water Engineer",
            "department": "Water Supply & Sewage Board",
            "ward": "Ward 14 - Green Park Zone",
            "photo_url": "/images/heads/ramcharan.jpg",
            "email": "chief.ramcharan@smartcity.gov",
            "phone": "+91 98765 43212",
            "address": "Hydro Works Building, Ward 14"
        },
        {
            "name": "Dr. Allu Arjun",
            "designation": "Commissioner of Electrical Grid & Smart Lighting",
            "department": "Electrical & Power Grid Department",
            "ward": "Ward 15 - IT Corridor Zone",
            "photo_url": "/images/heads/alluarjun.jpg",
            "email": "commissioner.allu@smartcity.gov",
            "phone": "+91 98765 43213",
            "address": "Power House Tower, Cyber District"
        },
        {
            "name": "Mr. Mahesh Babu Ghattamaneni",
            "designation": "Director General of Urban Transit & Traffic Regulation",
            "department": "Traffic Enforcement & Safety Division",
            "ward": "Ward 4 - Old City Zone",
            "photo_url": "/images/heads/maheshbabu.jpg",
            "email": "director.mahesh@smartcity.gov",
            "phone": "+91 98765 43214",
            "address": "Traffic Command Center, Central HQ"
        }
    ]

    head_objs = []
    for h in heads_data:
        existing = db.query(MunicipalityHead).filter(MunicipalityHead.contact_email == h["email"]).first()
        if not existing:
            m_head = MunicipalityHead(
                name=h["name"],
                designation=h["designation"],
                department_name=h["department"],
                assigned_ward=h["ward"],
                photo_url=h["photo_url"],
                contact_email=h["email"],
                contact_phone=h["phone"],
                office_address=h["address"]
            )
            db.add(m_head)
            db.commit()
            db.refresh(m_head)
            head_objs.append(m_head)
        else:
            head_objs.append(existing)

    # 3. Seed Default Registered User
    default_user = db.query(User).filter(User.email == "citizen@smartcity.gov").first()
    if not default_user:
        default_user = User(
            name="Rahul Sharma",
            email="citizen@smartcity.gov",
            password_hash=hash_password("citizen123"),
            registered_location="Jubilee Zone, Ward 12",
            ward="Ward 12",
            role=UserRole.CITIZEN.value
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # 4. Seed Multi-User City Complaints (Overview Feed)
    sample_complaints = [
        {
            "ticket_number": "CMP-20260824-A101",
            "registered_email": "suresh.reddy@smartcity.in",
            "original_text": "Massive road pothole near St. Jude School on Main Road causing major vehicular hazard.",
            "language": "English",
            "translated_text": "There is a massive pothole near St. Jude School on Main Road posing immediate traffic safety risk.",
            "summary": "Severe road pothole causing immediate traffic risk near school.",
            "public_agent_response": "🔍 Identified Severe Road Pothole (94% confidence, High Severity). Routed to Roads & Infrastructure.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Emergency road crew dispatched. Target SLA Resolution: Within 4 hours.",
            "latitude": 17.4435,
            "longitude": 78.3820,
            "address": "School Road, Ward 12, Jubilee Zone",
            "category": "Roads & Infrastructure",
            "subcategory": "Severe Road Pothole",
            "status": "IN_PROGRESS",
            "priority": "CRITICAL",
            "priority_score": 42,
            "priority_breakdown": {"issue_severity": 10, "location_risk": 10, "complaint_frequency": 6, "public_impact": 8, "safety_risk": 8, "total_score": 42},
            "estimated_resolution_hours": 4.0,
            "dept_code": "DEPT-RD",
            "head_index": 0,
            "vision_class": "pothole",
            "confidence": 0.94,
            "severity_level": "CRITICAL"
        },
        {
            "ticket_number": "CMP-20260824-B202",
            "registered_email": "anita.desai@gmail.com",
            "original_text": "Sadak par kachra bahut dino se jama hai, bohot badboo aa rahi hai.",
            "language": "Hindi",
            "translated_text": "Garbage has accumulated on the street for many days, causing a severe foul odor.",
            "summary": "Commercial market garbage dump overflow requiring immediate cleanup.",
            "public_agent_response": "🔍 Identified Garbage Overflow (91% confidence, High Severity). Sanitation truck dispatched.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Dispatched waste compactor crew. Target SLA: Within 12 hours.",
            "latitude": 17.4370,
            "longitude": 78.4480,
            "address": "Central Market Square, Ward 8",
            "category": "Sanitation & Waste",
            "subcategory": "Garbage Overflow & Waste Dump",
            "status": "ASSIGNED",
            "priority": "HIGH",
            "priority_score": 32,
            "priority_breakdown": {"issue_severity": 8, "location_risk": 7, "complaint_frequency": 5, "public_impact": 7, "safety_risk": 5, "total_score": 32},
            "estimated_resolution_hours": 12.0,
            "dept_code": "DEPT-SAN",
            "head_index": 1,
            "vision_class": "garbage_overflow",
            "confidence": 0.91,
            "severity_level": "HIGH"
        },
        {
            "ticket_number": "CMP-20260823-C303",
            "registered_email": "vikram.k@outlook.com",
            "original_text": "Main water pipeline burst near Green Park Colony park gate. Clean drinking water flooding the road.",
            "language": "English",
            "translated_text": "Main water supply pipeline burst causing high pressure water flooding.",
            "summary": "Major potable water pipeline burst flooding public street.",
            "public_agent_response": "🔍 Identified Water Pipeline Leakage (96% confidence, High Severity). Hydro engineers notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Valve isolation team dispatched. Target SLA: Within 8 hours.",
            "latitude": 17.4120,
            "longitude": 78.4350,
            "address": "Green Park Colony, Ward 14",
            "category": "Water & Sewage",
            "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "IN_PROGRESS",
            "priority": "HIGH",
            "priority_score": 35,
            "priority_breakdown": {"issue_severity": 8, "location_risk": 8, "complaint_frequency": 6, "public_impact": 7, "safety_risk": 6, "total_score": 35},
            "estimated_resolution_hours": 8.0,
            "dept_code": "DEPT-WTR",
            "head_index": 2,
            "vision_class": "water_leakage",
            "confidence": 0.96,
            "severity_level": "HIGH"
        },
        {
            "ticket_number": "CMP-20260822-D404",
            "registered_email": "priya.patel@citymail.com",
            "original_text": "Streetlights not working on Cyber Boulevard road for 3 days. Complete darkness.",
            "language": "English",
            "translated_text": "Streetlights non-functional causing dark street hazards along IT Corridor.",
            "summary": "Non-functional streetlight grid creating dark accident prone zone.",
            "public_agent_response": "🔍 Identified Damaged Streetlight (92% confidence). Electrical grid maintenance assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Smart lighting repair vehicle dispatched. Target SLA: Within 12 hours.",
            "latitude": 17.4500,
            "longitude": 78.3700,
            "address": "Cyber Boulevard, Ward 15",
            "category": "Electrical & Power",
            "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED",
            "priority": "MEDIUM",
            "priority_score": 22,
            "priority_breakdown": {"issue_severity": 5, "location_risk": 5, "complaint_frequency": 4, "public_impact": 5, "safety_risk": 3, "total_score": 22},
            "estimated_resolution_hours": 12.0,
            "dept_code": "DEPT-ELE",
            "head_index": 3,
            "vision_class": "damaged_streetlight",
            "confidence": 0.92,
            "severity_level": "MEDIUM"
        },
        {
            "ticket_number": "CMP-20260821-E505",
            "registered_email": "mohammed.ali@gmail.com",
            "original_text": "Commercial trucks parked illegally in no-parking zone completely blocking traffic flow.",
            "language": "English",
            "translated_text": "Heavy vehicle illegal obstruction causing severe traffic jam.",
            "summary": "Illegal parking blocking two-way emergency vehicle movement.",
            "public_agent_response": "🔍 Identified Illegal Parking & Vehicle Obstruction (90% confidence). Traffic towing notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Traffic warden squad and towing dispatched. Target SLA: Within 2 hours.",
            "latitude": 17.3600,
            "longitude": 78.4700,
            "address": "Old City Gateway, Ward 4",
            "category": "Traffic & Safety",
            "subcategory": "Illegal Parking & Vehicle Obstruction",
            "status": "RESOLVED",
            "priority": "HIGH",
            "priority_score": 28,
            "priority_breakdown": {"issue_severity": 6, "location_risk": 8, "complaint_frequency": 5, "public_impact": 6, "safety_risk": 3, "total_score": 28},
            "estimated_resolution_hours": 2.0,
            "dept_code": "DEPT-TRF",
            "head_index": 4,
            "vision_class": "illegal_parking",
            "confidence": 0.90,
            "severity_level": "HIGH"
        }
    ]

    for sc in sample_complaints:
        existing = db.query(Complaint).filter(Complaint.ticket_number == sc["ticket_number"]).first()
        if not existing:
            dept_obj = dept_objs.get(sc["dept_code"])
            h_obj = head_objs[sc["head_index"]] if sc["head_index"] < len(head_objs) else head_objs[0]
            c = Complaint(
                ticket_number=sc["ticket_number"],
                registered_email=sc["registered_email"],
                original_text=sc["original_text"],
                detected_language=sc["language"],
                translated_text=sc["translated_text"],
                summary=sc["summary"],
                public_agent_response=sc["public_agent_response"],
                gov_agent_response=sc["gov_agent_response"],
                latitude=sc["latitude"],
                longitude=sc["longitude"],
                address=sc["address"],
                category=sc["category"],
                subcategory=sc["subcategory"],
                status=sc["status"],
                priority=sc["priority"],
                priority_score=sc["priority_score"],
                priority_breakdown=sc["priority_breakdown"],
                estimated_resolution_hours=sc["estimated_resolution_hours"],
                assigned_department_id=dept_obj.id if dept_obj else None,
                municipality_head_id=h_obj.id if h_obj else None,
                email_feedback_sent=1
            )
            db.add(c)
            db.commit()
            db.refresh(c)

            # Vision Detection
            v = VisionDetection(
                complaint_id=c.id,
                detected_class=sc["vision_class"],
                confidence=sc["confidence"],
                severity_level=sc["severity_level"],
                bounding_boxes=[{"x1": 100, "y1": 100, "x2": 400, "y2": 400}]
            )
            db.add(v)

            # Agent Logs
            logs = [
                ("Smart Vision AI Agent", f"Analyzed uploaded image -> Detected '{sc['vision_class']}' with {int(sc['confidence']*100)}% confidence."),
                ("Priority & Routing Agent", f"Evaluated priority score: {sc['priority_score']}/50 -> Assigned to '{dept_obj.name}'."),
                ("Public AI Agent", f"Rendered citizen text box report."),
                ("Government Administrative AI Agent", f"Assigned Municipality Head '{h_obj.name}' and issued work order directive.")
            ]

            for name, reason in logs:
                al = AgentExecutionLog(
                    complaint_id=c.id,
                    agent_name=name,
                    reasoning=reason,
                    execution_time_ms=15
                )
                db.add(al)

            db.commit()

    db.close()
    print("[SeedData] Database seeded successfully with Municipality Heads, default users, and multi-user city complaints.")

if __name__ == "__main__":
    seed_database()
