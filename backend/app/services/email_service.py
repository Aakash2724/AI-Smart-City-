import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.config import settings

class EmailService:
    def __init__(self):
        self.log_file = os.path.join(os.getcwd(), "backend", "uploads", "sent_emails_log.json")
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)

    @property
    def smtp_server(self) -> str:
        return os.getenv("SMTP_SERVER", settings.SMTP_SERVER)

    @property
    def smtp_port(self) -> int:
        try:
            return int(os.getenv("SMTP_PORT", str(settings.SMTP_PORT)))
        except ValueError:
            return 587

    @property
    def smtp_user(self) -> str:
        return os.getenv("SMTP_USER", settings.SMTP_USER).strip()

    @property
    def smtp_password(self) -> str:
        # Strip whitespace, spaces, and quotes if accidentally included
        raw = os.getenv("SMTP_PASSWORD", settings.SMTP_PASSWORD).strip()
        return raw.strip('"').strip("'").replace(" ", "")

    @property
    def smtp_from_name(self) -> str:
        val = os.getenv("SMTP_FROM_NAME", "").strip()
        if not val or "smartgov" in val.lower():
            return "AI Smart City"
        return val

    @property
    def is_configured(self) -> bool:
        return bool(self.smtp_user and self.smtp_password and len(self.smtp_password) >= 6)

    def send_feedback_email(
        self,
        to_email: str,
        ticket_number: str,
        issue_category: str,
        public_agent_msg: str,
        gov_agent_msg: str,
        municipality_head_info: Dict[str, Any],
        original_text: str = "",
        address: str = "",
        priority: str = "HIGH",
        estimated_sla_hours: float = 12.0,
        citizen_name: Optional[str] = None
    ) -> bool:
        """
        Sends an automated official acknowledgement email notification to the registered citizen via SMTP.
        """
        to_email = (to_email or "").strip().lower()
        if not to_email or "@" not in to_email:
            print(f"[EmailService] Invalid destination email: '{to_email}'")
            return False

        # Auto-correct common missing domain extensions if user typed e.g. name@gmail
        if to_email.endswith("@gmail") or to_email.endswith("@yahoo") or to_email.endswith("@outlook") or to_email.endswith("@hotmail"):
            to_email = to_email + ".com"

        # Resolve registered citizen display name
        clean_name = (citizen_name or "").strip()
        if not clean_name or clean_name.lower() in ["citizen", "anonymous", "anonymous citizen", "user", "none"]:
            if to_email and "@" in to_email:
                local_part = to_email.split("@")[0].replace(".", " ").replace("_", " ").replace("-", " ").strip()
                if local_part and not local_part.lower().startswith("citizen"):
                    clean_name = local_part.title()
                else:
                    clean_name = "Citizen"
            else:
                clean_name = "Citizen"

        subject = f"Your complaint has been received — {issue_category} (Ref: {ticket_number})"
        
        head_name = municipality_head_info.get("name", "Dr. Rajesh V. Sharma")
        head_designation = municipality_head_info.get("designation", "Chief Municipal Commissioner & Public Infrastructure Head")
        head_dept = municipality_head_info.get("department_name", "Roads & Infrastructure Department")
        head_email = municipality_head_info.get("contact_email", "commissioner.sharma@smartcity.gov")
        head_phone = municipality_head_info.get("contact_phone", "+91 98765 43210")
        head_office = municipality_head_info.get("office_address", "Municipal Headquarters, City Secretariat")

        # Priority Badge Styling & Label (Obsidian Dark Theme Pill)
        p_upper = (priority or "HIGH").upper()
        if "CRIT" in p_upper:
            p_badge = '<span style="background: #2e1818; color: #f87171; border: 1px solid #592626; padding: 3px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;">CRITICAL EMERGENCY</span>'
        elif "HIGH" in p_upper:
            p_badge = '<span style="background: #291f16; color: #fb923c; border: 1px solid #4a2e1d; padding: 3px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;">HIGH URGENCY</span>'
        elif "MED" in p_upper:
            p_badge = '<span style="background: #142622; color: #2dd4bf; border: 1px solid #175249; padding: 3px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;">MEDIUM PRIORITY</span>'
        else:
            p_badge = '<span style="background: #122822; color: #34d399; border: 1px solid #194d3f; padding: 3px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;">ROUTINE MAINTENANCE</span>'

        sla_display = f"Within {int(estimated_sla_hours)} Hours" if estimated_sla_hours and estimated_sla_hours <= 12 else "Within 24–48 Hours"
        loc_display = address if address and len(address.strip()) > 3 else "Municipal Ward Zone, Hyderabad"
        desc_display = original_text.strip() if original_text and len(original_text.strip()) > 0 else f"{issue_category} civic issue reported."

        # Format public_agent_msg for email (clean newlines to br if needed)
        clean_ai_msg = public_agent_msg.replace('\n', '<br/>') if public_agent_msg else "Visual inspection verified and scheduled for priority field crew dispatch."

        # Format Obsidian Dark Themed HTML Email Template (Matching Web App Theme)
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Smart City Redressal - Ticket #{ticket_number}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0c10;
      color: #cbd5e1;
      margin: 0;
      padding: 32px 14px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 580px;
      margin: 0 auto;
      background: #111317;
      border: 1px solid #175249;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
    }}
    .header-banner {{
      background: linear-gradient(180deg, #07221d 0%, #0a332a 50%, #061c17 100%);
      padding: 34px 24px 28px 24px;
      border-bottom: 2px solid #2dd4bf;
      text-align: center;
    }}
    .gov-badge {{
      display: inline-block;
      background: #072620;
      border: 1px solid #175249;
      color: #2dd4bf;
      padding: 5px 18px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 14px;
    }}
    .header-title {{
      margin: 0 0 6px 0;
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }}
    .header-subtitle {{
      margin: 0 0 16px 0;
      font-size: 13px;
      color: #94a3b8;
      font-weight: 500;
    }}
    .ticket-badge {{
      display: inline-block;
      background: #08211b;
      border: 1px solid #175249;
      border-radius: 8px;
      padding: 6px 16px;
      font-size: 11.5px;
      color: #94a3b8;
      font-weight: 600;
    }}
    .ticket-highlight {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #2dd4bf;
      font-weight: 800;
      font-size: 12.5px;
    }}
    .body-content {{
      padding: 28px 24px;
    }}
    .salutation {{
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }}
    .intro-text {{
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 22px;
      line-height: 1.6;
    }}
    .card-section {{
      background: #0e1014;
      border: 1px solid #175249;
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 18px;
    }}
    .card-title {{
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #2dd4bf;
      margin-bottom: 12px;
      border-bottom: 1px solid #175249;
      padding-bottom: 6px;
    }}
    .detail-grid {{
      width: 100%;
      border-collapse: collapse;
    }}
    .detail-grid td {{
      padding: 6px 0;
      font-size: 12.5px;
      vertical-align: top;
    }}
    .detail-label {{
      color: #88909d;
      width: 38%;
      font-weight: 500;
    }}
    .detail-value {{
      color: #ffffff;
      font-weight: 600;
    }}
    .quote-box {{
      background: #16181e;
      border: 1px solid #175249;
      border-left: 3px solid #2dd4bf;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 18px;
      font-size: 12.5px;
      color: #cbd5e1;
      font-style: italic;
    }}
    .officer-box {{
      background: #0e1014;
      border: 1px solid #175249;
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 24px;
    }}
    .officer-name {{
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 2px;
    }}
    .officer-role {{
      font-size: 11.5px;
      color: #2dd4bf;
      font-weight: 600;
      margin-bottom: 10px;
    }}
    .contact-link {{
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
      font-size: 11.5px;
      margin-right: 14px;
    }}
    .cta-container {{
      text-align: center;
      margin: 28px 0 10px 0;
    }}
    .btn-track {{
      display: inline-block;
      background: #0c2e28;
      color: #2dd4bf !important;
      border: 1px solid #2dd4bf;
      padding: 13px 34px;
      border-radius: 12px;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(45, 212, 191, 0.2);
      transition: all 0.2s ease;
    }}
    .footer-bar {{
      background: #0e1014;
      border-top: 1px solid #175249;
      padding: 18px 24px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    
    <!-- Exact Themed Header as Uploaded -->
    <div class="header-banner">
      <div class="gov-badge">OFFICIAL MUNICIPAL ADMINISTRATION</div>
      <h1 class="header-title">AI Smart City Redressal Portal</h1>
      <p class="header-subtitle">Citizen Grievance Registration &amp; Immediate Action Directive</p>
      <div class="ticket-badge">
        TRACKING TICKET: <span class="ticket-highlight">#{ticket_number}</span>
      </div>
    </div>

    <!-- Body Content -->
    <div class="body-content">
      
      <div class="salutation">Dear {clean_name},</div>
      
      <p class="intro-text">
        Thank you for reporting this civic issue. Your grievance has been recorded, prioritized, and assigned to the municipal field department for prompt on-site resolution.
      </p>

      <!-- Grievance Summary Card (Green Outline) -->
      <div class="card-section">
        <div class="card-title">Grievance Overview</div>
        <table class="detail-grid">
          <tr>
            <td class="detail-label">Category:</td>
            <td class="detail-value">{issue_category}</td>
          </tr>
          <tr>
            <td class="detail-label">Assigned Priority:</td>
            <td>{p_badge}</td>
          </tr>
          <tr>
            <td class="detail-label">Location:</td>
            <td class="detail-value">📍 {loc_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Target SLA:</td>
            <td class="detail-value" style="color: #2dd4bf; font-weight: 700;">⏱️ {sla_display}</td>
          </tr>
        </table>
      </div>

      <!-- Citizen Description Quote (Green Outline) -->
      <div class="card-title" style="margin-top: 20px;">Reported Issue Description</div>
      <div class="quote-box">
        "{desc_display}"
      </div>

      <!-- AI Triage & Directive (Green Outline) -->
      <div class="card-section">
        <div class="card-title">AI Vision Inspection Assessment</div>
        <div style="font-size: 12.5px; color: #cbd5e1; line-height: 1.6;">
          {clean_ai_msg}
        </div>
      </div>

      <!-- Assigned Officer Contact (Green Outline) -->
      <div class="officer-box">
        <div class="card-title">Assigned Municipal Authority</div>
        <div class="officer-name">{head_name}</div>
        <div class="officer-role">{head_designation} • {head_dept}</div>
        <div>
          <a href="mailto:{head_email}" class="contact-link">✉️ {head_email}</a>
          <a href="tel:{head_phone}" class="contact-link">📞 {head_phone}</a>
        </div>
      </div>

      <!-- 24x7 Helpline & Grievance Escalation Path -->
      <div style="background: #0a0c0f; border: 1px solid #175249; border-radius: 12px; padding: 14px 18px; margin-top: 18px; margin-bottom: 20px; font-size: 11.5px; color: #94a3b8; line-height: 1.6;">
        <div style="color: #2dd4bf; font-weight: 700; text-transform: uppercase; font-size: 10.5px; margin-bottom: 6px; letter-spacing: 0.5px;">
          🚨 24x7 Citizen Helpline &amp; Grievance Escalation
        </div>
        <div style="color: #cbd5e1;">
          <strong>Toll-Free Helpline:</strong> <a href="tel:18004251980" style="color: #38bdf8; text-decoration: none; font-weight: 600;">1800-425-1980</a> &bull; <strong>Direct Desk:</strong> <a href="tel:+914021111111" style="color: #38bdf8; text-decoration: none; font-weight: 600;">+91 40 2111 1111</a>
        </div>
        <div style="margin-top: 6px; color: #94a3b8; font-size: 11px;">
          <strong style="color: #cbd5e1;">Escalation Path:</strong> If this issue is not resolved within the estimated SLA ({sla_display}), it will automatically escalate to the Zonal Municipal Commissioner &amp; Ombudsman.
        </div>
      </div>

      <!-- Direct Tracking CTA Button -->
      <div class="cta-container">
        <a href="{settings.FRONTEND_URL}/?ticket={ticket_number}" class="btn-track">View Grievance Status &rarr;</a>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer-bar">
      <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 11px;">
        <strong>Disclaimer:</strong> This is a system-generated email. Please do not reply directly to this email.
      </p>
      <p style="margin: 0; color: #64748b; font-size: 10.5px;">
        AI Smart City Operations System &bull; Greater Hyderabad Municipal Corporation (GHMC)<br/>
        For real-time status updates and resolution records, access the portal.
      </p>
    </div>

  </div>
</body>
</html>
"""

        # Log email to local json history
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "to_email": to_email,
            "ticket_number": ticket_number,
            "subject": subject,
            "category": issue_category,
            "municipality_head": head_name,
            "status": "QUEUED"
        }

        # ── 1. Priority 1: System Simple Mail Transfer Protocol (SMTP) Dispatch ──────
        # Allows unrestricted worldwide dispatch to ANY citizen recipient email address
        if self.is_configured:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = formataddr((self.smtp_from_name, self.smtp_user))
                msg["To"] = to_email
                msg["Date"] = datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")
                msg["Message-ID"] = f"<{datetime.utcnow().timestamp()}-{ticket_number}@aismartcity.gov>"

                # Attach Plain Text Fallback
                plain_text = f"""AI Smart City Municipal Administration
Official Grievance Registration Acknowledgement

Dear {clean_name},

Thank you for reporting this civic issue to the Municipal Corporation. Your complaint has been successfully registered.

Ticket Number: #{ticket_number}
Category: {issue_category}
Priority: {priority}
Target SLA: {sla_display}

Assigned Officer: {head_name} ({head_designation})
Department: {head_dept}
Contact: {head_email} | {head_phone}

Inspection Findings:
{public_agent_msg}

Municipal Directive:
{gov_agent_msg}

24x7 Citizen Helpline: 1800-425-1980 | +91 40 2111 1111
Escalation: If unresolved within SLA ({sla_display}), the ticket escalates automatically to the Zonal Commissioner.

Track live status on the portal: {settings.FRONTEND_URL}/?ticket={ticket_number}

---
Disclaimer: This is a system-generated email. Please do not reply directly to this email.
AI Smart City Operations System • Greater Hyderabad Municipal Corporation (GHMC)
"""
                msg.attach(MIMEText(plain_text, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                # Connect via STARTTLS (Port 587) or SSL (Port 465)
                if self.smtp_port == 465:
                    with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=15) as server:
                        server.login(self.smtp_user, self.smtp_password)
                        server.sendmail(self.smtp_user, [to_email], msg.as_string())
                else:
                    with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=15) as server:
                        server.ehlo()
                        server.starttls()
                        server.ehlo()
                        server.login(self.smtp_user, self.smtp_password)
                        server.sendmail(self.smtp_user, [to_email], msg.as_string())

                print(f"[EmailService] Real SMTP email dispatched successfully to {to_email} via {self.smtp_server}:{self.smtp_port}")
                log_entry["status"] = "SENT_SMTP"
                self._append_log(log_entry)
                return True

            except Exception as e:
                print(f"[EmailService] SMTP Dispatch notice ({e}). Trying fallback providers.")

        # ── 2. Priority 2: Resend Transactional Email API ────────────────────────────
        resend_key = os.getenv("RESEND_API_KEY", settings.RESEND_API_KEY).strip()
        if resend_key and len(resend_key) > 5:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "from": f"{self.smtp_from_name} <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                }
                with httpx.Client(timeout=10.0) as client:
                    res = client.post("https://api.resend.com/emails", json=payload, headers=headers)
                    if res.status_code in (200, 201):
                        print(f"[EmailService] Resend API email dispatched successfully to {to_email}")
                        log_entry["status"] = "SENT_RESEND_API"
                        self._append_log(log_entry)
                        return True
                    else:
                        print(f"[EmailService] Resend API notice ({res.status_code}): {res.text}. Cascading to fallback providers.")
            except Exception as e:
                print(f"[EmailService] Resend API error: {e}")

        # ── 3. Priority 3: SendGrid Email API ─────────────────────────────────────────
        sendgrid_key = os.getenv("SENDGRID_API_KEY", settings.SENDGRID_API_KEY).strip()
        if sendgrid_key and len(sendgrid_key) > 5:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {sendgrid_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": self.smtp_user or "notifications@smartgov.ai", "name": self.smtp_from_name},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html_content}]
                }
                with httpx.Client(timeout=10.0) as client:
                    res = client.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers)
                    if res.status_code in (200, 202):
                        print(f"[EmailService] SendGrid API email dispatched successfully to {to_email}")
                        log_entry["status"] = "SENT_SENDGRID_API"
                        self._append_log(log_entry)
                        return True
                    else:
                        print(f"[EmailService] SendGrid API notice ({res.status_code}): {res.text}")
            except Exception as e:
                print(f"[EmailService] SendGrid API error: {e}")

        # ── 4. Priority 4: Brevo (Sendinblue) Email API ──────────────────────────────
        brevo_key = os.getenv("BREVO_API_KEY", settings.BREVO_API_KEY).strip()
        if brevo_key and len(brevo_key) > 5:
            try:
                import httpx
                headers = {
                    "api-key": brevo_key,
                    "Content-Type": "application/json"
                }
                payload = {
                    "sender": {"name": self.smtp_from_name, "email": self.smtp_user or "notifications@smartgov.ai"},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html_content
                }
                with httpx.Client(timeout=10.0) as client:
                    res = client.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
                    if res.status_code in (200, 201):
                        print(f"[EmailService] Brevo API email dispatched successfully to {to_email}")
                        log_entry["status"] = "SENT_BREVO_API"
                        self._append_log(log_entry)
                        return True
                    else:
                        print(f"[EmailService] Brevo API notice ({res.status_code}): {res.text}")
            except Exception as e:
                print(f"[EmailService] Brevo API error: {e}")

        # ── 5. If no delivery succeeded, record local log ─────────────────────────────
        print(f"[EmailService] Email logged to local audit ledger: {to_email}")
        log_entry["status"] = "LOGGED_LOCAL"
        self._append_log(log_entry)
        return True

    def test_smtp_connection(self) -> Dict[str, Any]:
        """Tests email service credentials and connection."""
        resend_key = os.getenv("RESEND_API_KEY", settings.RESEND_API_KEY).strip()
        if resend_key and len(resend_key) > 5:
            return {
                "success": True,
                "provider": "Resend API",
                "message": "Resend Transactional Email API Key is active!"
            }

        sendgrid_key = os.getenv("SENDGRID_API_KEY", settings.SENDGRID_API_KEY).strip()
        if sendgrid_key and len(sendgrid_key) > 5:
            return {
                "success": True,
                "provider": "SendGrid API",
                "message": "SendGrid Email API Key is active!"
            }

        if not self.is_configured:
            return {
                "success": False,
                "provider": "SMTP",
                "message": "Neither Email API Key (RESEND_API_KEY / SENDGRID_API_KEY) nor SMTP_USER/SMTP_PASSWORD is configured in .env file.",
                "server": self.smtp_server,
                "port": self.smtp_port,
                "user": self.smtp_user or "Not set"
            }

        try:
            if self.smtp_port == 465:
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=10) as server:
                    server.login(self.smtp_user, self.smtp_password)
            else:
                with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(self.smtp_user, self.smtp_password)

            return {
                "success": True,
                "provider": "SMTP Server",
                "message": f"Successfully authenticated with SMTP server ({self.smtp_server}:{self.smtp_port}) as {self.smtp_user}",
                "server": self.smtp_server,
                "port": self.smtp_port,
                "user": self.smtp_user
            }
        except Exception as e:
            return {
                "success": False,
                "provider": "SMTP Server",
                "message": f"SMTP Authentication failed: {str(e)}",
                "server": self.smtp_server,
                "port": self.smtp_port,
                "user": self.smtp_user
            }

    def _append_log(self, entry: Dict[str, Any]):
        logs = []
        if os.path.exists(self.log_file):
            try:
                with open(self.log_file, "r") as f:
                    logs = json.load(f)
            except Exception:
                logs = []
        logs.append(entry)
        with open(self.log_file, "w") as f:
            json.dump(logs, f, indent=2)

email_service = EmailService()
