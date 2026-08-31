import os
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil

from app.core.database import get_db
from app.core.config import settings
from app.models.db_models import Complaint, VisionDetection, AgentExecutionLog, Department, User
from app.models.schemas import ComplaintResponseSchema, ComplaintCreateSchema, VisionDetectionSchema, AgentExecutionLogSchema
from app.services.vision_service import vision_service
from app.services.nlp_service import nlp_service
from app.agents.workflow import multi_agent_workflow

from app.services.municipality_service import municipality_service
from app.services.email_service import email_service
from app.models.schemas import MunicipalityHeadSchema

router = APIRouter(prefix="/complaints", tags=["Complaints"])



@router.post("", response_model=ComplaintResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    original_text: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form("Main Street, Ward 12"),
    registered_email: Optional[str] = Form("citizen@smartcity.gov"),
    citizen_name: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Submits a new citizen complaint. Runs image vision, NLP text extraction,
    executes Dual AI Agent workflow (Visible Public Text Box + Hidden Government Agent),
    attaches location-matched Municipality Head photo/details, and sends feedback email notification.
    """
    ticket_num = f"CMP-{datetime.datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    
    # Save Image File if uploaded
    image_url = None
    file_path = None
    if image:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        filename = f"{uuid.uuid4().hex}_{image.filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/uploads/{filename}"

    # 1. Computer Vision Image Analysis
    vision_dets = []
    if file_path:
        vision_dets = vision_service.analyze_image(file_path, text_hint=original_text)

    # 2. NLP Pipeline
    nlp_data = nlp_service.process_complaint_text(original_text, address_hint=address)

    # 3. Multi-Agent Workflow Execution
    initial_state = {
        "complaint_id": ticket_num,
        "original_text": original_text,
        "latitude": latitude,
        "longitude": longitude,
        "address": address or "City Ward 12",
        "image_url": image_url,
        "vision_detections": vision_dets,
        "nlp_data": nlp_data,
        "category": "Unclassified",
        "subcategory": "Unclassified",
        "priority": "MEDIUM",
        "priority_score": 20,
        "priority_breakdown": {},
        "assigned_department_id": None,
        "assigned_department_name": "Municipal Department",
        "estimated_resolution_hours": 24.0,
        "citizen_response": "",
        "public_agent_response": "",
        "gov_agent_response": "",
        "agent_logs": []
    }

    final_state = multi_agent_workflow.run(initial_state)

    # 4. Match Municipality Head based on location/ward and classified category
    head_obj = municipality_service.get_head_by_location(
        db, 
        location_text=address or "", 
        ward_text=address or "",
        category=final_state.get("category", "")
    )

    # Match assigned department in DB
    dept_name = final_state.get("assigned_department_name")
    dept = db.query(Department).filter(Department.name.ilike(f"%{dept_name[:10]}%")).first()
    dept_id = dept.id if dept else None

    # Lookup registered User by email if available
    user_record = None
    clean_reg_email = (registered_email or "").strip().lower()
    if clean_reg_email:
        user_record = db.query(User).filter(User.email.ilike(clean_reg_email)).first()

    # Determine resolved citizen name
    final_citizen_name = (citizen_name or "").strip()
    if not final_citizen_name and user_record and user_record.name:
        final_citizen_name = user_record.name.strip()
    if not final_citizen_name and clean_reg_email and "@" in clean_reg_email:
        local = clean_reg_email.split("@")[0].replace(".", " ").replace("_", " ").replace("-", " ").strip()
        if local and not local.lower().startswith("citizen"):
            final_citizen_name = local.title()
    if not final_citizen_name:
        final_citizen_name = "Citizen"

    # Create Complaint DB Record
    complaint = Complaint(
        ticket_number=ticket_num,
        citizen_id=user_record.id if user_record else None,
        citizen_name=final_citizen_name,
        registered_email=clean_reg_email or "citizen@smartcity.gov",
        original_text=original_text,
        detected_language=nlp_data.get("detected_language", "English"),
        translated_text=nlp_data.get("translated_text"),
        summary=nlp_data.get("summary"),
        public_agent_response=final_state.get("public_agent_response"),
        gov_agent_response=final_state.get("gov_agent_response"),
        image_url=image_url,
        latitude=latitude,
        longitude=longitude,
        address=address,
        category=final_state.get("category"),
        subcategory=final_state.get("subcategory"),
        status="ASSIGNED",
        priority=final_state.get("priority"),
        priority_score=final_state.get("priority_score"),
        priority_breakdown=final_state.get("priority_breakdown"),
        estimated_resolution_hours=final_state.get("estimated_resolution_hours"),
        assigned_department_id=dept_id,
        municipality_head_id=head_obj.id if head_obj else None,
        email_feedback_sent=1
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Save Vision Detections
    for det in vision_dets:
        v_rec = VisionDetection(
            complaint_id=complaint.id,
            detected_class=det.get("detected_class"),
            confidence=det.get("confidence"),
            severity_level=det.get("severity_level"),
            bounding_boxes=det.get("bounding_boxes")
        )
        db.add(v_rec)

    # Save Agent Execution Logs
    for log in final_state.get("agent_logs", []):
        log_rec = AgentExecutionLog(
            complaint_id=complaint.id,
            agent_name=log.get("agent_name"),
            input_state=log.get("input_state"),
            output_state=log.get("output_state"),
            reasoning=log.get("reasoning"),
            execution_time_ms=log.get("execution_time_ms", 10)
        )
        db.add(log_rec)

    db.commit()
    db.refresh(complaint)

    # 5. Dispatch Automated Feedback Email via SMTP
    head_dict = {
        "name": head_obj.name if head_obj else "Dr. Rajesh V. Sharma",
        "designation": head_obj.designation if head_obj else "Chief Municipal Commissioner",
        "department_name": head_obj.department_name if head_obj else "Roads & Infrastructure Department",
        "contact_email": getattr(head_obj, "contact_email", "commissioner.sharma@smartcity.gov") if head_obj else "commissioner.sharma@smartcity.gov",
        "contact_phone": getattr(head_obj, "contact_phone", "+91 98765 43210") if head_obj else "+91 98765 43210",
        "office_address": getattr(head_obj, "office_address", "Municipal Headquarters, City Secretariat") if head_obj else "Municipal Headquarters, City Secretariat"
    }
    
    background_tasks.add_task(
        email_service.send_feedback_email,
        to_email=clean_reg_email or "citizen@smartcity.gov",
        ticket_number=ticket_num,
        issue_category=complaint.category,
        public_agent_msg=final_state.get("public_agent_response", ""),
        gov_agent_msg=final_state.get("gov_agent_response", ""),
        municipality_head_info=head_dict,
        original_text=original_text,
        address=address or "Municipal Ward 12",
        priority=complaint.priority or "HIGH",
        estimated_sla_hours=float(complaint.estimated_resolution_hours or 12.0),
        citizen_name=final_citizen_name
    )

    # Format response schema explicitly
    # Build a lookup for raw vision detection data (has img_width/img_height)
    raw_vision_map = {}
    for i, det in enumerate(vision_dets):
        raw_vision_map[i] = det

    v_schemas = [
        VisionDetectionSchema(
            id=v.id,
            detected_class=v.detected_class,
            confidence=v.confidence,
            severity_level=v.severity_level,
            bounding_boxes=v.bounding_boxes,
            annotated_image_url=v.annotated_image_url,
            img_width=raw_vision_map.get(i, {}).get("img_width"),
            img_height=raw_vision_map.get(i, {}).get("img_height"),
            category=raw_vision_map.get(i, {}).get("category"),
            subcategory=raw_vision_map.get(i, {}).get("subcategory")
        ) for i, v in enumerate(complaint.vision_detections)
    ]
    
    a_schemas = [
        AgentExecutionLogSchema(
            id=a.id,
            agent_name=a.agent_name,
            input_state=a.input_state,
            output_state=a.output_state,
            reasoning=a.reasoning,
            execution_time_ms=a.execution_time_ms,
            created_at=a.created_at
        ) for a in complaint.agent_logs
    ]

    m_schema = MunicipalityHeadSchema.from_orm(head_obj) if head_obj else None

    # Look up citizen name from registered email
    citizen_user = db.query(User).filter(User.email == registered_email).first() if registered_email else None
    citizen_name = citizen_user.name if citizen_user else None

    response_data = ComplaintResponseSchema(
        id=complaint.id,
        ticket_number=complaint.ticket_number,
        registered_email=complaint.registered_email,
        citizen_name=citizen_name,
        original_text=complaint.original_text,
        detected_language=complaint.detected_language,
        translated_text=complaint.translated_text,
        summary=complaint.summary,
        public_agent_response=complaint.public_agent_response,
        gov_agent_response=complaint.gov_agent_response,
        image_url=complaint.image_url,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        address=complaint.address,
        ward=complaint.ward,
        category=complaint.category,
        subcategory=complaint.subcategory,
        status=complaint.status,
        priority=complaint.priority,
        priority_score=complaint.priority_score,
        priority_breakdown=complaint.priority_breakdown,
        estimated_resolution_hours=complaint.estimated_resolution_hours,
        assigned_department_name=dept.name if dept else "Roads & Infrastructure",
        assigned_department_id=dept_id,
        municipality_head=m_schema,
        email_feedback_sent=complaint.email_feedback_sent,
        created_at=complaint.created_at,
        vision_detections=v_schemas,
        agent_logs=a_schemas
    )

    return response_data

@router.get("", response_model=List[ComplaintResponseSchema])
@router.head("", include_in_schema=False)
def list_complaints(email: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """Lists complaints with optional email filter, vision detections, agent reasoning logs, and assigned department."""
    # Auto-seed database if fewer than 35 complaints exist
    if not email and db.query(Complaint).count() < 35:
        try:
            from app.seed_data import seed_database
            seed_database()
        except Exception as e:
            print(f"[Complaints API] Auto seed notice: {e}")

    query = db.query(Complaint)
    if email:
        query = query.filter(Complaint.registered_email.ilike(email.strip()))
    complaints = query.order_by(Complaint.created_at.desc()).limit(limit).all()
    results = []
    for c in complaints:
        v_schemas = [
            VisionDetectionSchema(
                id=v.id,
                detected_class=v.detected_class,
                confidence=v.confidence,
                severity_level=v.severity_level,
                bounding_boxes=v.bounding_boxes,
                category=v.detected_class and (
                    "Sanitation & Waste" if v.detected_class == "garbage_overflow" else
                    "Water & Sewage" if v.detected_class == "water_leakage" else
                    "Roads & Infrastructure" if v.detected_class in ["pothole", "road_damage"] else
                    "Electrical & Power" if v.detected_class == "damaged_streetlight" else
                    "Traffic & Safety" if v.detected_class == "illegal_parking" else None
                ),
                subcategory=v.detected_class and (
                    "Garbage Overflow & Waste Dump" if v.detected_class == "garbage_overflow" else
                    "Water Main Leakage & Drainage Overflow" if v.detected_class == "water_leakage" else
                    "Severe Road Pothole & Asphalt Crater" if v.detected_class in ["pothole", "road_damage"] else
                    "Damaged Streetlight & Exposed Wiring" if v.detected_class == "damaged_streetlight" else
                    "Illegal Parking & Road Obstruction" if v.detected_class == "illegal_parking" else None
                )
            ) for v in c.vision_detections
        ]
        a_schemas = [
            AgentExecutionLogSchema(
                id=a.id,
                agent_name=a.agent_name,
                reasoning=a.reasoning,
                execution_time_ms=a.execution_time_ms,
                created_at=a.created_at
            ) for a in c.agent_logs
        ]
        m_schema = MunicipalityHeadSchema.from_orm(c.municipality_head) if c.municipality_head else None

        # Look up citizen name from record or registered email
        citizen_user = db.query(User).filter(User.email == c.registered_email).first() if c.registered_email else None
        citizen_name = c.citizen_name or (citizen_user.name if citizen_user else None) or "Citizen"

        res = ComplaintResponseSchema(
            id=c.id,
            ticket_number=c.ticket_number,
            registered_email=c.registered_email,
            citizen_name=citizen_name,
            original_text=c.original_text,
            detected_language=c.detected_language,
            translated_text=c.translated_text,
            summary=c.summary,
            public_agent_response=c.public_agent_response,
            gov_agent_response=c.gov_agent_response,
            image_url=c.image_url,
            latitude=c.latitude,
            longitude=c.longitude,
            address=c.address,
            ward=c.ward,
            category=c.category,
            subcategory=c.subcategory,
            status=c.status,
            priority=c.priority,
            priority_score=c.priority_score,
            priority_breakdown=c.priority_breakdown,
            estimated_resolution_hours=c.estimated_resolution_hours,
            assigned_department_name=c.department.name if c.department else "Roads & Infrastructure",
            assigned_department_id=c.assigned_department_id,
            municipality_head=m_schema,
            email_feedback_sent=c.email_feedback_sent,
            created_at=c.created_at,
            vision_detections=v_schemas,
            agent_logs=a_schemas
        )
        results.append(res)
    return results

@router.api_route("/set-resolved-count", methods=["GET", "POST"], tags=["Complaints"])
def set_resolved_complaints_count(target: int = 23, db: Session = Depends(get_db)):
    """Sets exact target number of resolved complaints in the database (default 23)."""
    all_complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).all()
    resolved_count = 0
    for idx, c in enumerate(all_complaints):
        if idx < target:
            c.status = "RESOLVED"
            resolved_count += 1
        else:
            if c.status == "RESOLVED":
                c.status = "IN_PROGRESS"
    db.commit()
    return {"status": "success", "resolved_count": resolved_count, "total_complaints": len(all_complaints)}

@router.api_route("/seed-sample-data", methods=["GET", "POST"], tags=["Complaints"])
def seed_sample_complaints(db: Session = Depends(get_db)):
    """Triggers database seeding with comprehensive Indian complaints and resolved cases."""
    from app.seed_data import seed_database
    seed_database()
    total = db.query(Complaint).count()
    return {"status": "success", "message": f"Database seeded successfully with {total} complaints."}

@router.get("/{complaint_id}", response_model=ComplaintResponseSchema)
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    """Retrieves a single complaint by ID or Ticket Number."""
    c = db.query(Complaint).filter((Complaint.id == complaint_id) | (Complaint.ticket_number == complaint_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    res = ComplaintResponseSchema.from_orm(c)
    if c.department:
        res.assigned_department_name = c.department.name
    if c.municipality_head:
        res.municipality_head = MunicipalityHeadSchema.from_orm(c.municipality_head)
    return res

@router.delete("/user/{email}", status_code=status.HTTP_200_OK)
def delete_user_complaints(email: str, db: Session = Depends(get_db)):
    """Deletes all complaint history for a specific registered user email."""
    complaints = db.query(Complaint).filter(
        (Complaint.registered_email == email) | 
        (Complaint.registered_email == None)
    ).all()
    count = len(complaints)
    for c in complaints:
        db.delete(c)
    db.commit()
    return {"message": f"Successfully deleted {count} complaints for {email}", "deleted_count": count}

@router.delete("/{complaint_id}", status_code=status.HTTP_200_OK)
def delete_complaint(complaint_id: str, db: Session = Depends(get_db)):
    """Deletes a single complaint by ID or Ticket Number."""
    c = db.query(Complaint).filter((Complaint.id == complaint_id) | (Complaint.ticket_number == complaint_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    ticket = c.ticket_number
    db.delete(c)
    db.commit()
    return {"message": f"Successfully deleted complaint #{ticket}", "ticket_number": ticket}

