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
        if "sqlite" in str(engine.url):
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
            "email": "commissioner.prabhas@smartcity.gov.in",
            "phone": "+91 98765 43210",
            "address": "Municipal Headquarters, Block A, City Secretariat"
        },
        {
            "name": "Mr. Nandamuri Taraka Rama Rao Jr",
            "designation": "Director of Sanitation & Urban Environmental Safety",
            "department": "Sanitation & Waste Management Board",
            "ward": "Ward 8 - Central Market Zone",
            "photo_url": "/images/heads/ntr.jpg",
            "email": "director.ntr@smartcity.gov.in",
            "phone": "+91 98765 43211",
            "address": "Clean City Complex, Ward 8 Office"
        },
        {
            "name": "Mr. Ram Charan Tej Konidela",
            "designation": "Chief Executive Water Engineer",
            "department": "Water Supply & Sewage Board",
            "ward": "Ward 14 - Green Park Zone",
            "photo_url": "/images/heads/ramcharan.jpg",
            "email": "chief.ramcharan@smartcity.gov.in",
            "phone": "+91 98765 43212",
            "address": "Hydro Works Building, Ward 14"
        },
        {
            "name": "Dr. Allu Arjun",
            "designation": "Commissioner of Electrical Grid & Smart Lighting",
            "department": "Electrical & Power Grid Department",
            "ward": "Ward 15 - IT Corridor Zone",
            "photo_url": "/images/heads/alluarjun.jpg",
            "email": "commissioner.allu@smartcity.gov.in",
            "phone": "+91 98765 43213",
            "address": "Power House Tower, Cyber District"
        },
        {
            "name": "Mr. Mahesh Babu Ghattamaneni",
            "designation": "Director General of Urban Transit & Traffic Regulation",
            "department": "Traffic Enforcement & Safety Division",
            "ward": "Ward 4 - Old City Zone",
            "photo_url": "/images/heads/maheshbabu.jpg",
            "email": "director.mahesh@smartcity.gov.in",
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

    # 4. 48 Realistic Diverse Indian Complaints Dataset (Active + Resolved)
    sample_complaints = [
        # --- ROADS & INFRASTRUCTURE ---
        {
            "ticket_number": "CMP-20260824-A101",
            "registered_email": "suresh.reddy@smartcity.in",
            "citizen_name": "Suresh Reddy",
            "original_text": "Massive road pothole near St. Jude School on Main Road causing major vehicular hazard.",
            "language": "English",
            "translated_text": "Massive pothole near St. Jude School on Main Road posing immediate traffic safety risk.",
            "summary": "Severe road pothole causing immediate traffic risk near school.",
            "public_agent_response": "🔍 Identified Severe Road Pothole (94% confidence, High Severity). Routed to Roads & Infrastructure.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Emergency road crew dispatched. Target SLA Resolution: Within 4 hours.",
            "latitude": 17.4435, "longitude": 78.3820,
            "address": "School Road, Jubilee Hills, Ward 12", "ward": "Ward 12",
            "category": "Roads & Infrastructure", "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "IN_PROGRESS", "priority": "CRITICAL", "priority_score": 42,
            "estimated_resolution_hours": 4.0, "dept_code": "DEPT-RD", "head_index": 0,
            "vision_class": "pothole", "confidence": 0.94, "severity_level": "CRITICAL", "days_ago": 6
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
            "latitude": 17.4180, "longitude": 78.4420,
            "address": "Road No 10, Banjara Hills, Ward 10", "ward": "Ward 10",
            "category": "Roads & Infrastructure", "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 45,
            "estimated_resolution_hours": 4.0, "dept_code": "DEPT-RD", "head_index": 0,
            "vision_class": "pothole", "confidence": 0.96, "severity_level": "CRITICAL", "days_ago": 5
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
            "latitude": 17.4410, "longitude": 78.5010,
            "address": "Station Road, Secunderabad, Ward 3", "ward": "Ward 3",
            "category": "Roads & Infrastructure", "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "ASSIGNED", "priority": "MEDIUM", "priority_score": 26,
            "estimated_resolution_hours": 8.0, "dept_code": "DEPT-RD", "head_index": 0,
            "vision_class": "pothole", "confidence": 0.92, "severity_level": "MEDIUM", "days_ago": 4
        },
        {
            "ticket_number": "CMP-20260816-RD04",
            "registered_email": "anand.vardhan@outlook.com",
            "citizen_name": "Anand Vardhan",
            "original_text": "Tar broken completely and large crater on Begumpet Flyover down-ramp.",
            "language": "English",
            "translated_text": "Asphalt wear and deep road cavity on flyover descent creating dangerous commute.",
            "summary": "Asphalt crater on Begumpet Flyover ramp.",
            "public_agent_response": "🔍 Identified Flyover Asphalt Defect (95% confidence). Road resurfacing wing dispatched.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Bitumen paver unit applied 50mm hot mix. Resolved: Flyover ramp smooth.",
            "latitude": 17.4440, "longitude": 78.4680,
            "address": "Begumpet Airport Road, Ward 6", "ward": "Ward 6",
            "category": "Roads & Infrastructure", "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 38,
            "estimated_resolution_hours": 6.0, "dept_code": "DEPT-RD", "head_index": 0,
            "vision_class": "pothole", "confidence": 0.95, "severity_level": "HIGH", "days_ago": 4
        },
        {
            "ticket_number": "CMP-20260815-RD05",
            "registered_email": "manish.tiwari@gmail.com",
            "citizen_name": "Manish Tiwari",
            "original_text": "Sadak par divider toot gaya hai aur concrete pieces road par bikhre hain.",
            "language": "Hindi",
            "translated_text": "Road median divider damaged with concrete rubble scattered across traffic lanes.",
            "summary": "Broken concrete road divider obstruction.",
            "public_agent_response": "🔍 Identified Road Barrier & Debris Hazard (93% confidence). Assigned to Civil Works.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Median repair team cleared rubble and installed reflective kerb stones. Resolved.",
            "latitude": 17.3950, "longitude": 78.4310,
            "address": "Mehdipatnam Ring Road, Ward 7", "ward": "Ward 7",
            "category": "Roads & Infrastructure", "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "RESOLVED", "priority": "MEDIUM", "priority_score": 28,
            "estimated_resolution_hours": 8.0, "dept_code": "DEPT-RD", "head_index": 0,
            "vision_class": "pothole", "confidence": 0.93, "severity_level": "MEDIUM", "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260814-RD06",
            "registered_email": "kiranmai.reddy@gmail.com",
            "citizen_name": "Kiranmai Reddy",
            "original_text": "మణికొండ మెయిన్ రోడ్డులో గుంతలు పడి ద్విచక్ర వాహనాలు జారిపడుతున్నాయి.",
            "language": "Telugu",
            "translated_text": "Potholes on Manikonda main road causing two-wheelers to skid.",
            "summary": "Dangerous road craters on Manikonda main street.",
            "public_agent_response": "🔍 Identified Road Surface Depression (94% confidence). Road maintenance squad notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Instant cold patch compound applied. Resolved: Road leveled.",
            "latitude": 17.3980, "longitude": 78.3750,
            "address": "Manikonda Pipeline Road, Ward 20", "ward": "Ward 20",
            "category": "Roads & Infrastructure", "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 36,
            "estimated_resolution_hours": 6.0, "dept_code": "DEPT-RD", "head_index": 0,
            "vision_class": "pothole", "confidence": 0.94, "severity_level": "HIGH", "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260813-RD07",
            "registered_email": "tarun.tej@gmail.com",
            "citizen_name": "Tarun Tej",
            "original_text": "Speed breaker marks erased completely near school zone in Alwal.",
            "language": "English",
            "translated_text": "Unmarked speed bump causing vehicles to jump abruptly near school.",
            "summary": "Faded speed breaker zebra marking in school zone.",
            "public_agent_response": "🔍 Identified Unmarked Speed Breaker (91% confidence). Traffic civil engineering assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: High-visibility thermoplastic reflective paint applied. Resolved.",
            "latitude": 17.5020, "longitude": 78.5100,
            "address": "IG Statue Road, Alwal, Ward 1", "ward": "Ward 1",
            "category": "Roads & Infrastructure", "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "RESOLVED", "priority": "MEDIUM", "priority_score": 24,
            "estimated_resolution_hours": 12.0, "dept_code": "DEPT-RD", "head_index": 0,
            "vision_class": "pothole", "confidence": 0.91, "severity_level": "MEDIUM", "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260812-RD08",
            "registered_email": "vikas.mehra@gmail.com",
            "citizen_name": "Vikas Mehra",
            "original_text": "Road cave-in near stormwater drain outlet at Tarnaka crossroads.",
            "language": "English",
            "translated_text": "Structural road subsidence near culvert outlet threatening asphalt collapse.",
            "summary": "Culvert subsidence and asphalt road crack.",
            "public_agent_response": "🔍 Identified Structural Road Settlement (96% confidence). Structural engineer team assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Soil stabilization and RCC slab reinforcment underway.",
            "latitude": 17.4280, "longitude": 78.5380,
            "address": "Tarnaka Junction, Ward 2", "ward": "Ward 2",
            "category": "Roads & Infrastructure", "subcategory": "Severe Road Pothole & Asphalt Crater",
            "status": "IN_PROGRESS", "priority": "CRITICAL", "priority_score": 44,
            "estimated_resolution_hours": 8.0, "dept_code": "DEPT-RD", "head_index": 0,
            "vision_class": "pothole", "confidence": 0.96, "severity_level": "CRITICAL", "days_ago": 1
        },

        # --- SANITATION & WASTE MANAGEMENT ---
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
            "latitude": 17.4370, "longitude": 78.4480,
            "address": "Central Market Square, Ward 8", "ward": "Ward 8",
            "category": "Sanitation & Waste", "subcategory": "Garbage Overflow & Waste Dump",
            "status": "IN_PROGRESS", "priority": "HIGH", "priority_score": 32,
            "estimated_resolution_hours": 12.0, "dept_code": "DEPT-SAN", "head_index": 1,
            "vision_class": "garbage_overflow", "confidence": 0.91, "severity_level": "HIGH", "days_ago": 6
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
            "latitude": 17.3680, "longitude": 78.5270,
            "address": "Main Road, Dilsukhnagar, Ward 5", "ward": "Ward 5",
            "category": "Sanitation & Waste", "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 36,
            "estimated_resolution_hours": 8.0, "dept_code": "DEPT-SAN", "head_index": 1,
            "vision_class": "garbage_overflow", "confidence": 0.97, "severity_level": "HIGH", "days_ago": 5
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
            "latitude": 17.4600, "longitude": 78.3600,
            "address": "Botanical Garden Road, Kondapur, Ward 19", "ward": "Ward 19",
            "category": "Sanitation & Waste", "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 33,
            "estimated_resolution_hours": 12.0, "dept_code": "DEPT-SAN", "head_index": 1,
            "vision_class": "garbage_overflow", "confidence": 0.94, "severity_level": "HIGH", "days_ago": 5
        },
        {
            "ticket_number": "CMP-20260815-SN04",
            "registered_email": "deepa.banerjee@gmail.com",
            "citizen_name": "Deepa Banerjee",
            "original_text": "Medical waste and plastic bottles dumped openly behind hospital boundary wall.",
            "language": "English",
            "translated_text": "Open disposal of clinical plastic waste behind healthcare facility.",
            "summary": "Hazardous biomedical waste disposal in public open ground.",
            "public_agent_response": "🔍 Identified Bio-Waste & Hazardous Dump (98% confidence). Pollution Board unit alerted.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Specialized Hazmat sanitization vehicle cleared site. Resolved: Disinfected & notice served.",
            "latitude": 17.4480, "longitude": 78.3810,
            "address": "Hitec City Hospital Lane, Ward 15", "ward": "Ward 15",
            "category": "Sanitation & Waste", "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 46,
            "estimated_resolution_hours": 4.0, "dept_code": "DEPT-SAN", "head_index": 1,
            "vision_class": "garbage_overflow", "confidence": 0.98, "severity_level": "CRITICAL", "days_ago": 4
        },
        {
            "ticket_number": "CMP-20260814-SN05",
            "registered_email": "siddharth.m@gmail.com",
            "citizen_name": "Siddharth Malhotra",
            "original_text": "చెత్త కుప్పలు చాలా రోజులుగా ఎత్తకపోవడంతో దుర్వాసన వస్తోంది. దోమలు పెరుగుతున్నాయి.",
            "language": "Telugu",
            "translated_text": "Garbage heaps have not been cleared for days, causing foul smell and mosquito breeding.",
            "summary": "Uncollected domestic solid waste heap creating vector hazard.",
            "public_agent_response": "🔍 Identified Domestic Solid Waste Pile (95% confidence). Ward 18 sanitation inspector assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Sanitation tipper truck cleared 3 tons of garbage. Resolved: Anti-larval spraying done.",
            "latitude": 17.4900, "longitude": 78.4000,
            "address": "KPHB Phase 1, Ward 18, Kukatpally", "ward": "Ward 18",
            "category": "Sanitation & Waste", "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 37,
            "estimated_resolution_hours": 8.0, "dept_code": "DEPT-SAN", "head_index": 1,
            "vision_class": "garbage_overflow", "confidence": 0.95, "severity_level": "HIGH", "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260813-SN06",
            "registered_email": "bhavna.chawla@gmail.com",
            "citizen_name": "Bhavna Chawla",
            "original_text": "Commercial fish market waste dumped on road side attracting vultures and dogs.",
            "language": "English",
            "translated_text": "Perishable animal market residue accumulating on public street.",
            "summary": "Perishable organic market waste dump requiring deep sanitization.",
            "public_agent_response": "🔍 Identified Organic Waste Spill (96% confidence). Rapid response sanitation unit dispatched.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Suction compactor lifted waste and applied lime powder disinfectant. Resolved.",
            "latitude": 17.3820, "longitude": 78.4850,
            "address": "Moazzam Jahi Market, Ward 8", "ward": "Ward 8",
            "category": "Sanitation & Waste", "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 39,
            "estimated_resolution_hours": 6.0, "dept_code": "DEPT-SAN", "head_index": 1,
            "vision_class": "garbage_overflow", "confidence": 0.96, "severity_level": "HIGH", "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260812-SN07",
            "registered_email": "mohammed.z@gmail.com",
            "citizen_name": "Mohammed Zeeshan",
            "original_text": "Dead animal lying near Charminar monument road for over 24 hours.",
            "language": "English",
            "translated_text": "Animal carcass on public historic street requiring immediate veterinary removal.",
            "summary": "Animal carcass on historic pedestrian street.",
            "public_agent_response": "🔍 Identified Bio-Hazard Animal Carcass (99% confidence). Veterinary sanitation unit dispatched.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Special emergency veterinary carcass squad disposed safely and sanitized area. Resolved.",
            "latitude": 17.3610, "longitude": 78.4740,
            "address": "Patel Market Road, Charminar, Ward 4", "ward": "Ward 4",
            "category": "Sanitation & Waste", "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 49,
            "estimated_resolution_hours": 2.0, "dept_code": "DEPT-SAN", "head_index": 1,
            "vision_class": "garbage_overflow", "confidence": 0.99, "severity_level": "CRITICAL", "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260811-SN08",
            "registered_email": "swati.s@gmail.com",
            "citizen_name": "Swati Sengupta",
            "original_text": "Green park corner turned into open garbage dumping ground by street vendors.",
            "language": "English",
            "translated_text": "Public urban park perimeter abused as unauthorized dump site.",
            "summary": "Unauthorized vendor waste accumulation around public park.",
            "public_agent_response": "🔍 Identified Solid Waste Infringement (92% confidence). Assigned to Park Sanitation.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Sanitation crew cleared 2 dumper bins and installed 'No Dumping' CCTV signage. Resolved.",
            "latitude": 17.4140, "longitude": 78.4380,
            "address": "Green Park Colony Gate 2, Ward 14", "ward": "Ward 14",
            "category": "Sanitation & Waste", "subcategory": "Garbage Overflow & Waste Dump",
            "status": "RESOLVED", "priority": "MEDIUM", "priority_score": 27,
            "estimated_resolution_hours": 12.0, "dept_code": "DEPT-SAN", "head_index": 1,
            "vision_class": "garbage_overflow", "confidence": 0.92, "severity_level": "MEDIUM", "days_ago": 1
        },

        # --- WATER SUPPLY & SEWAGE ---
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
            "latitude": 17.4120, "longitude": 78.4350,
            "address": "Green Park Colony, Ward 14", "ward": "Ward 14",
            "category": "Water & Sewage", "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "IN_PROGRESS", "priority": "HIGH", "priority_score": 35,
            "estimated_resolution_hours": 8.0, "dept_code": "DEPT-WTR", "head_index": 2,
            "vision_class": "water_leakage", "confidence": 0.96, "severity_level": "HIGH", "days_ago": 6
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
            "latitude": 17.4850, "longitude": 78.3900,
            "address": "KPHB Colony 4th Phase, Ward 18, Kukatpally", "ward": "Ward 18",
            "category": "Water & Sewage", "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 38,
            "estimated_resolution_hours": 6.0, "dept_code": "DEPT-WTR", "head_index": 2,
            "vision_class": "water_leakage", "confidence": 0.95, "severity_level": "HIGH", "days_ago": 5
        },
        {
            "ticket_number": "CMP-20260818-WT03",
            "registered_email": "meenakshi.s@gmail.com",
            "citizen_name": "Meenakshi Sundaram",
            "original_text": "Drinking water coming mixed with brown dirty sewage in residential taps for 2 days.",
            "language": "English",
            "translated_text": "Severe contamination of municipal potable tap water with sewage inflow.",
            "summary": "Tap water sewage contamination in residential society.",
            "public_agent_response": "🔍 Identified Water Contamination Crisis (99% confidence). Water Quality Control activated.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Pipeline cross-connection pinpointed and isolated. Clean chlorination flushed. Resolved.",
            "latitude": 17.4350, "longitude": 78.4410,
            "address": "Banjara Hills Road No 12, Ward 10", "ward": "Ward 10",
            "category": "Water & Sewage", "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 48,
            "estimated_resolution_hours": 4.0, "dept_code": "DEPT-WTR", "head_index": 2,
            "vision_class": "water_leakage", "confidence": 0.99, "severity_level": "CRITICAL", "days_ago": 4
        },
        {
            "ticket_number": "CMP-20260817-WT04",
            "registered_email": "sneha.k@gmail.com",
            "citizen_name": "Sneha Kulkarni",
            "original_text": "Drainage manhole lid broken and open on busy footpath near bus stop.",
            "language": "English",
            "translated_text": "Missing sewer cover on pedestrian transit corridor creating fatal fall risk.",
            "summary": "Open sewer manhole with missing cast iron cover.",
            "public_agent_response": "🔍 Identified Missing Manhole Cover Hazard (97% confidence). Emergency crew assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Heavy-duty SFRC circular manhole cover fitted and locked. Resolved.",
            "latitude": 17.4420, "longitude": 78.3840,
            "address": "Madhapur Main Road, Ward 15", "ward": "Ward 15",
            "category": "Water & Sewage", "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 47,
            "estimated_resolution_hours": 3.0, "dept_code": "DEPT-WTR", "head_index": 2,
            "vision_class": "water_leakage", "confidence": 0.97, "severity_level": "CRITICAL", "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260816-WT05",
            "registered_email": "divya.n@gmail.com",
            "citizen_name": "Divya Narayanan",
            "original_text": "No municipal drinking water supply received in Ward 12 for the past 48 hours.",
            "language": "English",
            "translated_text": "Complete disruption of municipal water supply pipeline feeder.",
            "summary": "48-hour municipal water supply outage across sector.",
            "public_agent_response": "🔍 Identified Water Grid Supply Disruption (94% confidence). Pumping station engineers notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Booster pump motor rewound and 4 emergency water tankers sent. Resolved: Normal flow resumed.",
            "latitude": 17.4320, "longitude": 78.4050,
            "address": "Jubilee Hills Road No 36, Ward 12", "ward": "Ward 12",
            "category": "Water & Sewage", "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 38,
            "estimated_resolution_hours": 8.0, "dept_code": "DEPT-WTR", "head_index": 2,
            "vision_class": "water_leakage", "confidence": 0.94, "severity_level": "HIGH", "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260815-WT06",
            "registered_email": "pradeep.j@gmail.com",
            "citizen_name": "Pradeep Joshi",
            "original_text": "Pani ki pipeline leak ho kar sadak par 2 feet paani bhar gaya hai.",
            "language": "Hindi",
            "translated_text": "Water pipeline leakage causing severe waterlogging of up to 2 feet on street.",
            "summary": "Waterlogging on main road due to underground pipeline fracture.",
            "public_agent_response": "🔍 Identified Pipeline Fracture & Waterlogging (95% confidence). Water board crew assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Dewatering pump operational and 300mm pipe sleeve welded. Resolved.",
            "latitude": 17.4520, "longitude": 78.3580,
            "address": "Gachibowli Stadium Road, Ward 16", "ward": "Ward 16",
            "category": "Water & Sewage", "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 39,
            "estimated_resolution_hours": 6.0, "dept_code": "DEPT-WTR", "head_index": 2,
            "vision_class": "water_leakage", "confidence": 0.95, "severity_level": "HIGH", "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260814-WT07",
            "registered_email": "ananya.b@gmail.com",
            "citizen_name": "Ananya Bhattacharya",
            "original_text": "Stormwater drain blocked by plastic bags causing rainwater backflow into houses.",
            "language": "English",
            "translated_text": "Stormwater drainage clogged with non-biodegradable waste causing flooding.",
            "summary": "Clogged stormwater drain causing urban flooding in colony.",
            "public_agent_response": "🔍 Identified Storm Drain Blockage (93% confidence). Desilting machinery dispatched.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Mechanical excavator cleared 150m drain channel. Target SLA: Within 8 hours.",
            "latitude": 17.4700, "longitude": 78.3200,
            "address": "Miyapur Metro Station Back Road, Ward 17", "ward": "Ward 17",
            "category": "Water & Sewage", "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "IN_PROGRESS", "priority": "HIGH", "priority_score": 36,
            "estimated_resolution_hours": 8.0, "dept_code": "DEPT-WTR", "head_index": 2,
            "vision_class": "water_leakage", "confidence": 0.93, "severity_level": "HIGH", "days_ago": 1
        },
        {
            "ticket_number": "CMP-20260813-WT08",
            "registered_email": "farida.begum@gmail.com",
            "citizen_name": "Farida Begum",
            "original_text": "Gutter ka ganda paani road par beh raha hai, dukaano ke andar ja raha hai.",
            "language": "Hindi",
            "translated_text": "Sewer overflow flooding commercial storefronts on main road.",
            "summary": "Commercial street sewer backflow into retail stores.",
            "public_agent_response": "🔍 Identified Commercial Drain Overflow (94% confidence). Hydro engineering squad dispatched.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: High-pressure jetting machine dispatched. Target SLA: Within 6 hours.",
            "latitude": 17.3710, "longitude": 78.4900,
            "address": "Malakpet Market Lane, Ward 5", "ward": "Ward 5",
            "category": "Water & Sewage", "subcategory": "Water Main Leakage & Drainage Overflow",
            "status": "ASSIGNED", "priority": "HIGH", "priority_score": 37,
            "estimated_resolution_hours": 6.0, "dept_code": "DEPT-WTR", "head_index": 2,
            "vision_class": "water_leakage", "confidence": 0.94, "severity_level": "HIGH", "days_ago": 1
        },

        # --- ELECTRICAL & POWER GRID ---
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
            "latitude": 17.4500, "longitude": 78.3700,
            "address": "Cyber Boulevard, Ward 15, Madhapur", "ward": "Ward 15",
            "category": "Electrical & Power", "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED", "priority": "MEDIUM", "priority_score": 22,
            "estimated_resolution_hours": 12.0, "dept_code": "DEPT-ELE", "head_index": 3,
            "vision_class": "damaged_streetlight", "confidence": 0.92, "severity_level": "MEDIUM", "days_ago": 5
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
            "latitude": 17.4375, "longitude": 78.4485,
            "address": "Market Road, Ameerpet, Ward 9", "ward": "Ward 9",
            "category": "Electrical & Power", "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 48,
            "estimated_resolution_hours": 2.0, "dept_code": "DEPT-ELE", "head_index": 3,
            "vision_class": "damaged_streetlight", "confidence": 0.98, "severity_level": "CRITICAL", "days_ago": 5
        },
        {
            "ticket_number": "CMP-20260817-EL03",
            "registered_email": "gautam.s@gmail.com",
            "citizen_name": "Gautam Singhania",
            "original_text": "Streetlight pole tilted dangerously at 45 degrees after vehicle collision.",
            "language": "English",
            "translated_text": "Structural damage to streetlight pole threatening collapse onto traffic.",
            "summary": "Tilted streetlight pole hazard on Jubilee Hills road.",
            "public_agent_response": "🔍 Identified Damaged Light Pole Structural Defect (97% confidence). Pole erection crew notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Crane vehicle dismantled tilted pole and installed new galvanized octagonal pole. Resolved.",
            "latitude": 17.4290, "longitude": 78.4110,
            "address": "Road No 45, Jubilee Hills, Ward 12", "ward": "Ward 12",
            "category": "Electrical & Power", "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 46,
            "estimated_resolution_hours": 4.0, "dept_code": "DEPT-ELE", "head_index": 3,
            "vision_class": "damaged_streetlight", "confidence": 0.97, "severity_level": "CRITICAL", "days_ago": 4
        },
        {
            "ticket_number": "CMP-20260816-EL04",
            "registered_email": "pallavi.s@gmail.com",
            "citizen_name": "Pallavi Sharma",
            "original_text": "Electric transformer sparking violently with loud noise in residential area.",
            "language": "English",
            "translated_text": "Severe arcing and transformer malfunction posing immediate fire outbreak risk.",
            "summary": "Sparking distribution transformer in densely populated colony.",
            "public_agent_response": "🔍 Identified Transformer Arcing Hazard (99% confidence). Power Grid substation alerted.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Substation feeder tripped, blown HT fuse replaced and transformer oil refilled. Resolved.",
            "latitude": 17.4410, "longitude": 78.4980,
            "address": "MG Road, Secunderabad, Ward 3", "ward": "Ward 3",
            "category": "Electrical & Power", "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 49,
            "estimated_resolution_hours": 2.0, "dept_code": "DEPT-ELE", "head_index": 3,
            "vision_class": "damaged_streetlight", "confidence": 0.99, "severity_level": "CRITICAL", "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260815-EL05",
            "registered_email": "raghavendra.r@gmail.com",
            "citizen_name": "Raghavendra Rao",
            "original_text": "మా వీధిలో లైట్లు వెలగక 4 రోజులు అయింది. చీకట్లో మహిళలు వెళ్లడానికి భయపడుతున్నారు.",
            "language": "Telugu",
            "translated_text": "Streetlights non-functional for 4 days creating dark insecurity for women pedestrians.",
            "summary": "Non-functional residential streetlights creating dark zone.",
            "public_agent_response": "🔍 Identified Non-Functional Streetlight Grid (93% confidence). Electrical maintenance assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Timer switch and phase cable re-energized. Resolved: All 8 lights working.",
            "latitude": 17.4820, "longitude": 78.4110,
            "address": "Kukatpally Housing Board Phase 2, Ward 18", "ward": "Ward 18",
            "category": "Electrical & Power", "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED", "priority": "MEDIUM", "priority_score": 25,
            "estimated_resolution_hours": 12.0, "dept_code": "DEPT-ELE", "head_index": 3,
            "vision_class": "damaged_streetlight", "confidence": 0.93, "severity_level": "MEDIUM", "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260814-EL06",
            "registered_email": "sanjana.r@gmail.com",
            "citizen_name": "Sanjana Reddy",
            "original_text": "Flickering high-mast light at major traffic circle causing disorienting glare to drivers.",
            "language": "English",
            "translated_text": "High-mast lighting driver circuit fault causing strobe effect on intersection.",
            "summary": "Faulty high-mast light flickering at traffic circle.",
            "public_agent_response": "🔍 Identified High-Mast Lighting Controller Fault (91% confidence). Assigned to Power Division.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: 1000W LED driver replaced via hydraulic bucket truck. Resolved.",
            "latitude": 17.4390, "longitude": 78.3490,
            "address": "Gachibowli Stadium Circle, Ward 16", "ward": "Ward 16",
            "category": "Electrical & Power", "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED", "priority": "MEDIUM", "priority_score": 23,
            "estimated_resolution_hours": 12.0, "dept_code": "DEPT-ELE", "head_index": 3,
            "vision_class": "damaged_streetlight", "confidence": 0.91, "severity_level": "MEDIUM", "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260813-EL07",
            "registered_email": "ashish.s@gmail.com",
            "citizen_name": "Ashish Saxena",
            "original_text": "Underground cable damaged during road excavation, power cut in whole colony.",
            "language": "English",
            "translated_text": "Accidental underground power cable severing during utility trenching.",
            "summary": "Severed underground power cable causing localized blackout.",
            "public_agent_response": "🔍 Identified Power Grid Cable Severance (98% confidence). Substation cable jointing team alerted.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: 11kV cable jointing kit deployed. Target SLA: Within 4 hours.",
            "latitude": 17.4470, "longitude": 78.3710,
            "address": "Mindspace IT Park Road, Ward 15", "ward": "Ward 15",
            "category": "Electrical & Power", "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "IN_PROGRESS", "priority": "CRITICAL", "priority_score": 45,
            "estimated_resolution_hours": 4.0, "dept_code": "DEPT-ELE", "head_index": 3,
            "vision_class": "damaged_streetlight", "confidence": 0.98, "severity_level": "CRITICAL", "days_ago": 1
        },
        {
            "ticket_number": "CMP-20260812-EL08",
            "registered_email": "vinay.mohan@gmail.com",
            "citizen_name": "Vinay Mohan",
            "original_text": "Streetlight feeder pillar box open with child-accessible 415V copper busbars.",
            "language": "English",
            "translated_text": "Unlatched electrical feeder distribution box posing lethal contact hazard.",
            "summary": "Open public electrical feeder pillar box on residential sidewalk.",
            "public_agent_response": "🔍 Identified Lethal Public Electrical Hazard (99% confidence). Immediate grid safety dispatch.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Safety lock installed and insulation panel reinstated. Resolved.",
            "latitude": 17.4160, "longitude": 78.4390,
            "address": "Banjara Hills Road No 1, Ward 10", "ward": "Ward 10",
            "category": "Electrical & Power", "subcategory": "Damaged Streetlight & Exposed Wiring",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 48,
            "estimated_resolution_hours": 2.0, "dept_code": "DEPT-ELE", "head_index": 3,
            "vision_class": "damaged_streetlight", "confidence": 0.99, "severity_level": "CRITICAL", "days_ago": 1
        },

        # --- TRAFFIC ENFORCEMENT & SAFETY ---
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
            "latitude": 17.3600, "longitude": 78.4700,
            "address": "Old City Gateway, Ward 4, Charminar Zone", "ward": "Ward 4",
            "category": "Traffic & Safety", "subcategory": "Illegal Parking & Road Obstruction",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 28,
            "estimated_resolution_hours": 2.0, "dept_code": "DEPT-TRF", "head_index": 4,
            "vision_class": "illegal_parking", "confidence": 0.90, "severity_level": "HIGH", "days_ago": 6
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
            "latitude": 17.4400, "longitude": 78.3480,
            "address": "Gachibowli Flyover Junction, Ward 16", "ward": "Ward 16",
            "category": "Traffic & Safety", "subcategory": "Illegal Parking & Road Obstruction",
            "status": "IN_PROGRESS", "priority": "HIGH", "priority_score": 34,
            "estimated_resolution_hours": 3.0, "dept_code": "DEPT-TRF", "head_index": 4,
            "vision_class": "illegal_parking", "confidence": 0.93, "severity_level": "HIGH", "days_ago": 5
        },
        {
            "ticket_number": "CMP-20260816-TR03",
            "registered_email": "karthik.s@gmail.com",
            "citizen_name": "Karthik Subramanian",
            "original_text": "Auto rickshaws parked haphazardly outside metro station blocking entire bus bay.",
            "language": "English",
            "translated_text": "Unauthorized passenger vehicle queuing obstructing public bus transport transit bay.",
            "summary": "Auto rickshaw unauthorized encroachment of metro bus bay.",
            "public_agent_response": "🔍 Identified Transit Corridor Encroachment (92% confidence). Traffic Police Division alerted.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Traffic enforcement squad cleared bus bay and established designated auto stand. Resolved.",
            "latitude": 17.4380, "longitude": 78.4490,
            "address": "Ameerpet Metro Interchange, Ward 9", "ward": "Ward 9",
            "category": "Traffic & Safety", "subcategory": "Illegal Parking & Road Obstruction",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 32,
            "estimated_resolution_hours": 2.0, "dept_code": "DEPT-TRF", "head_index": 4,
            "vision_class": "illegal_parking", "confidence": 0.92, "severity_level": "HIGH", "days_ago": 4
        },
        {
            "ticket_number": "CMP-20260815-TR04",
            "registered_email": "shreya.g@gmail.com",
            "citizen_name": "Shreya Ghoshal",
            "original_text": "Construction materials and sand gravel dumped on main road taking up entire left lane.",
            "language": "English",
            "translated_text": "Unauthorized building material dumping encroaching primary vehicular carriageway.",
            "summary": "Building material dumping encroaching active traffic carriageway.",
            "public_agent_response": "🔍 Identified Road Encroachment & Material Obstruction (94% confidence). Traffic enforcement notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Builder penalized and JCB loader removed sand within 3 hours. Resolved.",
            "latitude": 17.4310, "longitude": 78.4060,
            "address": "Road No 36, Jubilee Hills, Ward 12", "ward": "Ward 12",
            "category": "Traffic & Safety", "subcategory": "Illegal Parking & Road Obstruction",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 35,
            "estimated_resolution_hours": 3.0, "dept_code": "DEPT-TRF", "head_index": 4,
            "vision_class": "illegal_parking", "confidence": 0.94, "severity_level": "HIGH", "days_ago": 3
        },
        {
            "ticket_number": "CMP-20260814-TR05",
            "registered_email": "chetan.b@gmail.com",
            "citizen_name": "Chetan Bhagat",
            "original_text": "Traffic light stuck on RED in all 4 directions causing massive gridlock during peak rush hour.",
            "language": "English",
            "translated_text": "Microcontroller lockup causing all-phase RED at high-density traffic intersection.",
            "summary": "Signal controller firmware lockup causing 4-way gridlock.",
            "public_agent_response": "🔍 Identified Traffic Controller System Failure (97% confidence). Traffic Command Center notified.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Field technician rebooted controller and traffic warden manually routed flow. Resolved.",
            "latitude": 17.4470, "longitude": 78.3750,
            "address": "Inorbit Mall Intersection, Ward 15", "ward": "Ward 15",
            "category": "Traffic & Safety", "subcategory": "Illegal Parking & Road Obstruction",
            "status": "RESOLVED", "priority": "CRITICAL", "priority_score": 47,
            "estimated_resolution_hours": 1.0, "dept_code": "DEPT-TRF", "head_index": 4,
            "vision_class": "illegal_parking", "confidence": 0.97, "severity_level": "CRITICAL", "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260813-TR06",
            "registered_email": "sandhya.r@gmail.com",
            "citizen_name": "Sandhya Rani",
            "original_text": "రహదారిపై వ్యాపారులు బండ్లను అడ్డం పెట్టి రోడ్డును ఆక్రమించారు. నడవడానికి దారి లేదు.",
            "language": "Telugu",
            "translated_text": "Street pushcarts completely blocking public roadway and footpath leaving no space to walk.",
            "summary": "Street hawker pushcart encroachment of entire pedestrian road.",
            "public_agent_response": "🔍 Identified Hawkers Road Encroachment (91% confidence). Traffic division assigned.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Hawkers relocated to municipal designated vending zone. Resolved: Footpath cleared.",
            "latitude": 17.3650, "longitude": 78.4710,
            "address": "Laad Bazaar, Charminar, Ward 4", "ward": "Ward 4",
            "category": "Traffic & Safety", "subcategory": "Illegal Parking & Road Obstruction",
            "status": "RESOLVED", "priority": "MEDIUM", "priority_score": 26,
            "estimated_resolution_hours": 4.0, "dept_code": "DEPT-TRF", "head_index": 4,
            "vision_class": "illegal_parking", "confidence": 0.91, "severity_level": "MEDIUM", "days_ago": 2
        },
        {
            "ticket_number": "CMP-20260812-TR07",
            "registered_email": "chaitanya.k@gmail.com",
            "citizen_name": "Chaitanya Krishna",
            "original_text": "School bus broken down and abandoned in the middle of narrow road.",
            "language": "English",
            "translated_text": "Immobilized heavy vehicle obstructing single-lane municipal street.",
            "summary": "Broken down bus blocking narrow colony transit lane.",
            "public_agent_response": "🔍 Identified Heavy Vehicle Obstruction (95% confidence). Heavy recovery crane dispatched.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Municipal heavy recovery vehicle towed bus to depot. Resolved: Road clear.",
            "latitude": 17.4870, "longitude": 78.3920,
            "address": "KPHB Road No 3, Ward 18", "ward": "Ward 18",
            "category": "Traffic & Safety", "subcategory": "Illegal Parking & Road Obstruction",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 36,
            "estimated_resolution_hours": 2.0, "dept_code": "DEPT-TRF", "head_index": 4,
            "vision_class": "illegal_parking", "confidence": 0.95, "severity_level": "HIGH", "days_ago": 1
        },
        {
            "ticket_number": "CMP-20260811-TR08",
            "registered_email": "rohit.shetty@gmail.com",
            "citizen_name": "Rohit Shetty",
            "original_text": "Unauthorized private parking fee collection on public government road.",
            "language": "English",
            "translated_text": "Illegal extortion of parking charges on public municipal right of way.",
            "summary": "Illegal private parking toll racket on public road.",
            "public_agent_response": "🔍 Identified Illegal Parking Toll Extortion (93% confidence). Traffic Police vigilance alerted.",
            "gov_agent_response": "OFFICIAL DIRECTIVE: Police squad arrested unauthorized touts and put up 'Free Public Parking' board. Resolved.",
            "latitude": 17.4415, "longitude": 78.3800,
            "address": "Hitec City Cyber Towers Road, Ward 15", "ward": "Ward 15",
            "category": "Traffic & Safety", "subcategory": "Illegal Parking & Road Obstruction",
            "status": "RESOLVED", "priority": "HIGH", "priority_score": 38,
            "estimated_resolution_hours": 2.0, "dept_code": "DEPT-TRF", "head_index": 4,
            "vision_class": "illegal_parking", "confidence": 0.93, "severity_level": "HIGH", "days_ago": 1
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
                priority_breakdown=sc.get("priority_breakdown", {"issue_severity": 8, "location_risk": 7, "complaint_frequency": 6, "public_impact": 7, "safety_risk": 6, "total_score": sc["priority_score"]}),
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
            if not existing.citizen_name:
                existing.citizen_name = sc.get("citizen_name")
            if not existing.ward:
                existing.ward = sc.get("ward", "Ward 12")
            existing.status = sc["status"]
            db.commit()

    db.close()
    print(f"[SeedData] Database seeded successfully with Municipality Heads, default users, and {len(sample_complaints)} city complaints.")

if __name__ == "__main__":
    seed_database()
