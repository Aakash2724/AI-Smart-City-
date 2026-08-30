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
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Ensure users.photo_url exists
            res = conn.execute(text("PRAGMA table_info(users)"))
            cols = [row[1] for row in res.fetchall()]
            if "photo_url" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN photo_url TEXT;"))
                conn.commit()

            # Ensure complaints.citizen_name exists
            res_c = conn.execute(text("PRAGMA table_info(complaints)"))
            cols_c = [row[1] for row in res_c.fetchall()]
            if "citizen_name" not in cols_c:
                conn.execute(text("ALTER TABLE complaints ADD COLUMN citizen_name TEXT;"))
                conn.commit()
    except Exception as e:
        print(f"[SeedData] Column migration note: {e}")

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

    # 4. Seed Multi-User City Complaints (Comprehensive Realistic Indian Dataset)
    sample_complaints = [
        {
            "ticket_number": "CMP-20260824-A101",
            "registered_email": "suresh.reddy@smartcity.in",
            "citizen_name": "Suresh Reddy",
            "original_text": "Massive road pothole near St. Jude School on Main Road causing major vehicular hazard.",
            "language": "English",
            "translated_text": "There is a massive pothole near St. Jude School on Main Road posing immediate traffic safety risk.",
            "summary": "Severe road pothole causing immediate traffic risk near school.",
            "public_agent_response": "🔍 Identified Severe Road Pothole (94% confidence, High Severity). Routed to Roads & Infrastructure.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Emergency road crew dispatched. Target SLA Resolution: Within 4 hours.",
            "latitude": 17.4435,
            "longitude": 78.3820,
            "address": "School Road, Jubilee Hills, Ward 12",
            "ward": "Ward 12",
            "category": "Roads & Infrastructure",
            "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "IN_PROGRESS",
            "priority": "CRITICAL",
            "priority_score": 42,
            "priority_breakdown": {"issue_severity": 10, "location_risk": 10, "complaint_frequency": 6, "public_impact": 8, "safety_risk": 8, "total_score": 42},
            "estimated_resolution_hours": 4.0,
            "dept_code": "DEPT-RD",
            "head_index": 0,
            "vision_class": "pothole",
            "confidence": 0.94,
            "severity_level": "CRITICAL",
            "days_ago": 6
        },
        {
            "ticket_number": "CMP-20260824-B202",
            "registered_email": "anita.desai@gmail.com",
            "citizen_name": "Anita Desai",
            "original_text": "Sadak par kachra bahut dino se jama hai, bohot badboo aa rahi hai.",
            "language": "Hindi",
            "translated_text": "Garbage has accumulated on the street for many days, causing a severe foul odor.",
            "summary": "Commercial market garbage dump overflow requiring immediate cleanup.",
            "public_agent_response": "🔍 Identified Garbage Overflow (91% confidence, High Severity). Sanitation truck dispatched.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Dispatched waste compactor crew. Target SLA: Within 12 hours.",
            "latitude": 17.4370,
            "longitude": 78.4480,
            "address": "Central Market Square, Ward 8",
            "ward": "Ward 8",
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
            "severity_level": "HIGH",
            "days_ago": 5
        },
        {
            "ticket_number": "CMP-20260823-C303",
            "registered_email": "vikram.k@outlook.com",
            "citizen_name": "Vikram Kulkarni",
            "original_text": "Main water pipeline burst near Green Park Colony park gate. Clean drinking water flooding the road.",
            "language": "English",
            "translated_text": "Main water supply pipeline burst causing high pressure water flooding.",
            "summary": "Major potable water pipeline burst flooding public street.",
            "public_agent_response": "🔍 Identified Water Pipeline Leakage (96% confidence, High Severity). Hydro engineers notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Valve isolation team dispatched. Target SLA: Within 8 hours.",
            "latitude": 17.4120,
            "longitude": 78.4350,
            "address": "Green Park Colony, Ward 14",
            "ward": "Ward 14",
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
            "severity_level": "HIGH",
            "days_ago": 4
        },
        {
            "ticket_number": "CMP-20260822-D404",
            "registered_email": "priya.patel@citymail.com",
            "citizen_name": "Priya Patel",
            "original_text": "Streetlights not working on Cyber Boulevard road for 3 days. Complete darkness.",
            "language": "English",
            "translated_text": "Streetlights non-functional causing dark street hazards along IT Corridor.",
            "summary": "Non-functional streetlight grid creating dark accident prone zone.",
            "public_agent_response": "🔍 Identified Damaged Streetlight (92% confidence). Electrical grid maintenance assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Smart lighting repair vehicle dispatched. Resolved: 150W LED fixtures restored.",
            "latitude": 17.4500,
            "longitude": 78.3700,
            "address": "Cyber Boulevard, Ward 15, Madhapur",
            "ward": "Ward 15",
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
            "severity_level": "MEDIUM",
            "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260821-E505",
            "registered_email": "farhan.quadri@citymail.in",
            "citizen_name": "Syed Farhan Quadri",
            "original_text": "Commercial trucks parked illegally in no-parking zone completely blocking traffic flow.",
            "language": "English",
            "translated_text": "Heavy vehicle illegal obstruction causing severe traffic jam.",
            "summary": "Illegal parking blocking two-way emergency vehicle movement.",
            "public_agent_response": "🔍 Identified Illegal Parking & Vehicle Obstruction (90% confidence). Traffic towing notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Traffic warden squad dispatched. Resolved: Vehicles towed and penalty issued.",
            "latitude": 17.3600,
            "longitude": 78.4700,
            "address": "Old City Gateway, Ward 4, Charminar Zone",
            "ward": "Ward 4",
            "category": "Traffic & Safety",
            "subcategory": "Illegal Parking & Road Obstruction",
            "status": "RESOLVED",
            "priority": "HIGH",
            "priority_score": 28,
            "priority_breakdown": {"issue_severity": 6, "location_risk": 8, "complaint_frequency": 5, "public_impact": 6, "safety_risk": 3, "total_score": 28},
            "estimated_resolution_hours": 2.0,
            "dept_code": "DEPT-TRF",
            "head_index": 4,
            "vision_class": "illegal_parking",
            "confidence": 0.90,
            "severity_level": "HIGH",
            "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260820-F606",
            "registered_email": "kavita.srinivasan@outlook.com",
            "citizen_name": "Kavita Srinivasan",
            "original_text": "మా వీధిలో డ్రైనేజీ ఓవర్‌ఫ్లో అయి రోడ్డు మీద మురుగు నీరు పారుతోంది. తీవ్రమైన దుర్వాసన.",
            "language": "Telugu",
            "translated_text": "Drainage is overflowing on our street with sewage water flooding the road. Severe foul odor.",
            "summary": "Sewage manhole overflow flooding residential road.",
            "public_agent_response": "🔍 Identified Drainage & Sewage Overflow (95% confidence). Water & Sewage Board team assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: High-velocity jetting machine crew completed desilting. Resolved: Flow restored.",
            "latitude": 17.4850,
            "longitude": 78.3900,
            "address": "KPHB Colony 4th Phase, Ward 18, Kukatpally",
            "ward": "Ward 18",
            "category": "Water & Sewage",
            "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "RESOLVED",
            "priority": "HIGH",
            "priority_score": 38,
            "priority_breakdown": {"issue_severity": 8, "location_risk": 8, "complaint_frequency": 7, "public_impact": 8, "safety_risk": 7, "total_score": 38},
            "estimated_resolution_hours": 6.0,
            "dept_code": "DEPT-WTR",
            "head_index": 2,
            "vision_class": "water_leakage",
            "confidence": 0.95,
            "severity_level": "HIGH",
            "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260820-G707",
            "registered_email": "rajesh.verma@yahoo.co.in",
            "citizen_name": "Rajesh Verma",
            "original_text": "Deep potholes on Banjara Hills Road No 10 after heavy monsoon rain. Several bikers skidded.",
            "language": "English",
            "translated_text": "Dangerous potholes on Banjara Hills Road No 10 causing two-wheeler accidents.",
            "summary": "Monsoon crater potholes on high-traffic transit road.",
            "public_agent_response": "🔍 Identified Severe Road Surface Crater (96% confidence). Asphalt emergency crew notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Cold mix asphalt patch crew deployed. Resolved: Road surface leveled and compacted.",
            "latitude": 17.4180,
            "longitude": 78.4420,
            "address": "Road No 10, Banjara Hills, Ward 10",
            "ward": "Ward 10",
            "category": "Roads & Infrastructure",
            "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "RESOLVED",
            "priority": "CRITICAL",
            "priority_score": 45,
            "priority_breakdown": {"issue_severity": 10, "location_risk": 9, "complaint_frequency": 8, "public_impact": 9, "safety_risk": 9, "total_score": 45},
            "estimated_resolution_hours": 4.0,
            "dept_code": "DEPT-RD",
            "head_index": 0,
            "vision_class": "pothole",
            "confidence": 0.96,
            "severity_level": "CRITICAL",
            "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260819-H808",
            "registered_email": "pooja.deshmukh@gmail.com",
            "citizen_name": "Pooja Deshmukh",
            "original_text": "Community dustbin near Dilsukhnagar Metro Station has been overflowing for 4 days. Stray animals scattering waste.",
            "language": "English",
            "translated_text": "Commercial dumper bin overflowing near metro station creating public health hazard.",
            "summary": "10-ton commercial garbage bin overflowing near metro transit hub.",
            "public_agent_response": "🔍 Identified Garbage Overflow & Waste Dump (97% confidence). Sanitation Department notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: 10-ton mechanical refuse compactor dispatched. Resolved: Waste lifted and area bleached.",
            "latitude": 17.3680,
            "longitude": 78.5270,
            "address": "Main Road, Dilsukhnagar, Ward 5",
            "ward": "Ward 5",
            "category": "Sanitation & Waste",
            "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED",
            "priority": "HIGH",
            "priority_score": 36,
            "priority_breakdown": {"issue_severity": 8, "location_risk": 8, "complaint_frequency": 6, "public_impact": 8, "safety_risk": 6, "total_score": 36},
            "estimated_resolution_hours": 8.0,
            "dept_code": "DEPT-SAN",
            "head_index": 1,
            "vision_class": "garbage_overflow",
            "confidence": 0.97,
            "severity_level": "HIGH",
            "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260819-I909",
            "registered_email": "lakshmi.priya@gmail.com",
            "citizen_name": "Lakshmi Priya G",
            "original_text": "Exposed live electric wire hanging from transformer pole near Ameerpet vegetable market.",
            "language": "English",
            "translated_text": "High voltage live wire hanging dangerously low near public market.",
            "summary": "Hazardous exposed electrical wire dangling near public pedestrian zone.",
            "public_agent_response": "🔍 Identified Electrical Hazard & Exposed Wiring (98% confidence). Power Grid emergency response activated.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Power Grid lineman squad dispatched with aerial lift. Resolved: Insulated & secured.",
            "latitude": 17.4375,
            "longitude": 78.4485,
            "address": "Market Road, Ameerpet, Ward 9",
            "ward": "Ward 9",
            "category": "Electrical & Power",
            "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED",
            "priority": "CRITICAL",
            "priority_score": 48,
            "priority_breakdown": {"issue_severity": 10, "location_risk": 10, "complaint_frequency": 8, "public_impact": 10, "safety_risk": 10, "total_score": 48},
            "estimated_resolution_hours": 2.0,
            "dept_code": "DEPT-ELE",
            "head_index": 3,
            "vision_class": "damaged_streetlight",
            "confidence": 0.98,
            "severity_level": "CRITICAL",
            "days_ago": 1
        },
        {
            "ticket_number": "CMP-20260818-J010",
            "registered_email": "venkat.ramana@gmail.com",
            "citizen_name": "Venkat Ramana Rao",
            "original_text": "రోడ్డుపై ట్రాఫిక్ సిగ్నల్ పనిచేయడం లేదు. తీవ్రమైన ట్రాఫిక్ జామ్ ఏర్పడింది.",
            "language": "Telugu",
            "translated_text": "Traffic signals at major 4-way intersection not functioning, causing gridlock.",
            "summary": "Automated traffic signal controller outage at major 4-way crossroad.",
            "public_agent_response": "🔍 Identified Traffic Signal Malfunction (93% confidence). Traffic Operations Center notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Traffic signal technician squad dispatched. Target SLA: Within 3 hours.",
            "latitude": 17.4400,
            "longitude": 78.3480,
            "address": "Gachibowli Flyover Junction, Ward 16",
            "ward": "Ward 16",
            "category": "Traffic & Safety",
            "subcategory": "Illegal Parking & Road Obstruction",
            "status": "IN_PROGRESS",
            "priority": "HIGH",
            "priority_score": 34,
            "priority_breakdown": {"issue_severity": 7, "location_risk": 9, "complaint_frequency": 6, "public_impact": 7, "safety_risk": 5, "total_score": 34},
            "estimated_resolution_hours": 3.0,
            "dept_code": "DEPT-TRF",
            "head_index": 4,
            "vision_class": "illegal_parking",
            "confidence": 0.93,
            "severity_level": "HIGH",
            "days_ago": 1
        },
        {
            "ticket_number": "CMP-20260818-K111",
            "registered_email": "harish.patel@gmail.com",
            "citizen_name": "Harish Chandra Patel",
            "original_text": "Broken footpath slabs with open drainage pit near Secunderabad Clock Tower.",
            "language": "English",
            "translated_text": "Pedestrian sidewalk slab collapsed into stormwater drain causing dangerous hazard.",
            "summary": "Damaged pedestrian walkway slab with exposed pit.",
            "public_agent_response": "🔍 Identified Pedestrian Infrastructure Hazard (92% confidence). Municipal Works assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Concrete precast team dispatched. Target SLA: Within 8 hours.",
            "latitude": 17.4410,
            "longitude": 78.5010,
            "address": "Station Road, Secunderabad, Ward 3",
            "ward": "Ward 3",
            "category": "Roads & Infrastructure",
            "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "ASSIGNED",
            "priority": "MEDIUM",
            "priority_score": 26,
            "priority_breakdown": {"issue_severity": 6, "location_risk": 6, "complaint_frequency": 5, "public_impact": 5, "safety_risk": 4, "total_score": 26},
            "estimated_resolution_hours": 8.0,
            "dept_code": "DEPT-RD",
            "head_index": 0,
            "vision_class": "pothole",
            "confidence": 0.92,
            "severity_level": "MEDIUM",
            "days_ago": 1
        },
        {
            "ticket_number": "CMP-20260817-L212",
            "registered_email": "sunita.agrawal@gmail.com",
            "citizen_name": "Sunita Agrawal",
            "original_text": "Kondapur Botanical Garden road par illegal debris dump ho raha hai raat me.",
            "language": "Hindi",
            "translated_text": "Unauthorized construction debris dumping occurring along Botanical Garden road.",
            "summary": "Construction & demolition debris dumping blocking sidewalk.",
            "public_agent_response": "🔍 Identified Solid Waste & Debris Dumping (94% confidence). Sanitation Enforcement notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Waste enforcement unit deployed with hydraulic loader. Resolved: Debris removed.",
            "latitude": 17.4600,
            "longitude": 78.3600,
            "address": "Botanical Garden Road, Kondapur, Ward 19",
            "ward": "Ward 19",
            "category": "Sanitation & Waste",
            "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED",
            "priority": "HIGH",
            "priority_score": 33,
            "priority_breakdown": {"issue_severity": 7, "location_risk": 7, "complaint_frequency": 6, "public_impact": 7, "safety_risk": 6, "total_score": 33},
            "estimated_resolution_hours": 12.0,
            "dept_code": "DEPT-SAN",
            "head_index": 1,
            "vision_class": "garbage_overflow",
            "confidence": 0.94,
            "severity_level": "HIGH",
            "days_ago": 1
        }
    ]

    for sc in sample_complaints:
        existing = db.query(Complaint).filter(Complaint.ticket_number == sc["ticket_number"]).first()
        dept_obj = dept_objs.get(sc["dept_code"])
        h_obj = head_objs[sc["head_index"]] if sc["head_index"] < len(head_objs) else head_objs[0]
        
        # Calculate realistic timestamps based on days_ago
        created_time = datetime.datetime.utcnow() - datetime.timedelta(days=sc.get("days_ago", 1), hours=sc.get("head_index", 0) * 2)

        if not existing:
            c = Complaint(
                ticket_number=sc["ticket_number"],
                registered_email=sc["registered_email"],
                citizen_name=sc.get("citizen_name", "Citizen"),
                original_text=sc["original_text"],
                detected_language=sc["language"],
                translated_text=sc["translated_text"],
                summary=sc["summary"],
                public_agent_response=sc["public_agent_response"],
                gov_agent_response=sc["gov_agent_response"],
                latitude=sc["latitude"],
                longitude=sc["longitude"],
                address=sc["address"],
                ward=sc.get("ward", "Ward 12"),
                category=sc["category"],
                subcategory=sc["subcategory"],
                status=sc["status"],
                priority=sc["priority"],
                priority_score=sc["priority_score"],
                priority_breakdown=sc["priority_breakdown"],
                estimated_resolution_hours=sc["estimated_resolution_hours"],
                assigned_department_id=dept_obj.id if dept_obj else None,
                municipality_head_id=h_obj.id if h_obj else None,
                email_feedback_sent=1,
                created_at=created_time,
                updated_at=created_time
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
                bounding_boxes=[{"x1": 100, "y1": 100, "x2": 400, "y2": 400}],
                created_at=created_time
            )
            db.add(v)

            # Agent Logs
            logs = [
                ("Smart Vision AI Agent", f"Analyzed uploaded image -> Detected '{sc['vision_class']}' with {int(sc['confidence']*100)}% confidence."),
                ("Priority & Routing Agent", f"Evaluated priority score: {sc['priority_score']}/50 -> Assigned to '{dept_obj.name if dept_obj else 'Municipal Works'}'."),
                ("Public AI Agent", f"Rendered citizen text box report."),
                ("Government Administrative AI Agent", f"Assigned Municipality Head '{h_obj.name}' and issued work order directive.")
            ]

            for name, reason in logs:
                al = AgentExecutionLog(
                    complaint_id=c.id,
                    agent_name=name,
                    reasoning=reason,
                    execution_time_ms=15,
                    created_at=created_time
                )
                db.add(al)

            db.commit()
        else:
            # Update existing with citizen_name and ward if missing
            if not existing.citizen_name:
                existing.citizen_name = sc.get("citizen_name")
            if not existing.ward:
                existing.ward = sc.get("ward", "Ward 12")
            db.commit()

    db.close()
    print("[SeedData] Database seeded successfully with Municipality Heads, default users, and multi-user city complaints.")

if __name__ == "__main__":
    seed_database()
