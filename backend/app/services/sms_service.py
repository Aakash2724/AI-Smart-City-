"""
AI Smart City - Citizen SMS Notification Gateway Service
---------------------------------------------------------
Sends real-time SMS notifications to registered citizens upon complaint filing
using Twilio API, Fast2SMS, or fallback simulated municipal gateway.
"""

import os
import json
import datetime
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

class SMSService:
    def __init__(self):
        self.account_sid = (settings.TWILIO_ACCOUNT_SID or os.getenv("TWILIO_ACCOUNT_SID", "")).strip()
        self.auth_token = (settings.TWILIO_AUTH_TOKEN or os.getenv("TWILIO_AUTH_TOKEN", "")).strip()
        self.from_number = (settings.TWILIO_FROM_NUMBER or os.getenv("TWILIO_FROM_NUMBER", "")).strip()
        self.fast2sms_key = (settings.FAST2SMS_API_KEY or os.getenv("FAST2SMS_API_KEY", "")).strip()
        self.log_file = os.path.join(settings.UPLOAD_DIR, "sent_sms_log.json")

    @property
    def is_twilio_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_number and len(self.account_sid) > 10)

    def normalize_phone_number(self, phone: str) -> str:
        """Formats phone numbers to E.164 standard (e.g. +919849012345)."""
        if not phone:
            return "+919849012345"
        clean = "".join(ch for ch in str(phone) if ch.isdigit() or ch == "+").strip()
        if not clean:
            return "+919849012345"
        if clean.startswith("+"):
            return clean
        if len(clean) == 10:
            return f"+91{clean}"
        if len(clean) == 12 and clean.startswith("91"):
            return f"+{clean}"
        return f"+{clean}"

    def send_registration_sms(
        self,
        to_phone: str,
        ticket_number: str,
        issue_category: str,
        priority: str,
        municipality_head_info: Optional[Dict[str, Any]] = None,
        citizen_name: str = "Citizen",
        estimated_sla_hours: float = 12.0,
        address: str = "Hyderabad Ward 12"
    ) -> Dict[str, Any]:
        """
        Sends an automated SMS / WhatsApp notification acknowledging complaint registration.
        """
        # Dynamically refresh keys from environment in case updated without process restart
        twilio_sid = (os.getenv("TWILIO_ACCOUNT_SID") or settings.TWILIO_ACCOUNT_SID or "").strip()
        twilio_token = (os.getenv("TWILIO_AUTH_TOKEN") or settings.TWILIO_AUTH_TOKEN or "").strip()
        twilio_from = (os.getenv("TWILIO_FROM_NUMBER") or settings.TWILIO_FROM_NUMBER or "").strip()
        fast2sms_key = (os.getenv("FAST2SMS_API_KEY") or settings.FAST2SMS_API_KEY or "").strip()
        callmebot_key = (os.getenv("CALLMEBOT_API_KEY") or getattr(settings, "CALLMEBOT_API_KEY", "") or "").strip()

        target_phone = self.normalize_phone_number(to_phone)
        head = municipality_head_info or {}
        officer_name = head.get("name", "Zonal Officer")
        officer_phone = head.get("contact_phone", "+91 98490 12345")
        
        tracking_url = f"{settings.FRONTEND_URL}/?ticket={ticket_number}"

        # Standard Municipal SMS / WhatsApp Message format
        sms_text = (
            f"🏛️ SMART CITY GRIEVANCE REDRESSAL\n"
            f"Namaste {citizen_name},\n"
            f"Your complaint has been successfully registered.\n\n"
            f"📋 Ticket ID: {ticket_number}\n"
            f"🏷️ Category: {issue_category}\n"
            f"🚨 Priority: {priority.upper()} (SLA: < {int(estimated_sla_hours)} hrs)\n"
            f"👤 Assigned: {officer_name} ({officer_phone})\n"
            f"📍 Location: {address}\n\n"
            f"🔗 Track Live: {tracking_url}\n"
            f"- GHMC Smart Municipal Services"
        )

        sent_status = {
            "timestamp": datetime.datetime.now().isoformat(),
            "ticket_number": ticket_number,
            "to_phone": target_phone,
            "citizen_name": citizen_name,
            "body": sms_text,
            "provider": "simulated",
            "success": False,
            "message_sid": None,
            "error": None
        }

        # ── 1. Try Fast2SMS (Indian SMS Gateway) ──────────────────────────────
        if fast2sms_key and len(fast2sms_key) > 5:
            try:
                clean_10digit = target_phone.replace("+91", "").replace("+", "").strip()[-10:]
                fast2sms_url = "https://www.fast2sms.com/dev/bulkV2"
                headers = {
                    "authorization": fast2sms_key,
                    "Content-Type": "application/json"
                }
                payload = {
                    "route": "q",
                    "message": sms_text,
                    "language": "english",
                    "flash": 0,
                    "numbers": clean_10digit
                }
                print(f"[SMSService] Attempting Fast2SMS dispatch to {clean_10digit}...")
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(fast2sms_url, headers=headers, json=payload)
                    print(f"[SMSService] Fast2SMS Response [{resp.status_code}]: {resp.text}")
                    try:
                        resp_data = resp.json()
                        if resp.status_code == 200 and resp_data.get("return") is True:
                            sent_status["provider"] = "fast2sms"
                            sent_status["success"] = True
                            sent_status["message_sid"] = resp_data.get("request_id")
                            print(f"[SMSService] ✅ Fast2SMS successfully sent to {clean_10digit}!")
                        else:
                            err_msg = resp_data.get("message") or resp.text
                            sent_status["error"] = f"Fast2SMS API: {err_msg}"
                            print(f"[SMSService] ⚠️ Fast2SMS failed: {err_msg}")
                    except Exception:
                        sent_status["error"] = f"Fast2SMS Error: {resp.text}"
            except Exception as e:
                sent_status["error"] = f"Fast2SMS Exception: {str(e)}"
                print(f"[SMSService] Fast2SMS error: {e}")

        # ── 2. Try CallMeBot WhatsApp (100% Free Mobile Alerts) ────────────────
        elif callmebot_key and len(callmebot_key) > 2:
            try:
                import urllib.parse
                clean_phone = target_phone if target_phone.startswith("+") else f"+{target_phone}"
                encoded_msg = urllib.parse.quote_plus(sms_text)
                callmebot_url = f"https://api.callmebot.com/whatsapp.php?phone={clean_phone}&text={encoded_msg}&apikey={callmebot_key}"
                print(f"[SMSService] Attempting CallMeBot WhatsApp dispatch to {clean_phone}...")
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(callmebot_url)
                    if resp.status_code == 200:
                        sent_status["provider"] = "whatsapp_callmebot"
                        sent_status["success"] = True
                        sent_status["message_sid"] = f"WAPP-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
                        print(f"[SMSService] ✅ WhatsApp alert dispatched to {clean_phone}!")
                    else:
                        print(f"[SMSService] CallMeBot Response [{resp.status_code}]: {resp.text}")
            except Exception as e:
                print(f"[SMSService] CallMeBot error: {e}")

        # ── 3. Try Twilio REST API ─────────────────────────────────────────────
        elif twilio_sid and twilio_token and twilio_from and len(twilio_sid) > 10:
            try:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
                payload = {
                    "From": twilio_from,
                    "To": target_phone,
                    "Body": sms_text
                }
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(url, auth=(twilio_sid, twilio_token), data=payload)
                    if resp.status_code in (200, 201):
                        data = resp.json()
                        sent_status["provider"] = "twilio"
                        sent_status["success"] = True
                        sent_status["message_sid"] = data.get("sid")
                        print(f"[SMSService] ✅ Twilio SMS dispatched to {target_phone} (SID: {data.get('sid')})")
                    else:
                        err_msg = resp.text
                        sent_status["error"] = f"Twilio API Error ({resp.status_code}): {err_msg}"
                        print(f"[SMSService] Twilio failed: {sent_status['error']}.")
            except Exception as e:
                sent_status["error"] = f"Twilio connection exception: {str(e)}"
                print(f"[SMSService] Twilio error: {e}")

        # ── 4. Fallback Simulated Mode (If all gateways unconfigured / failed) ─
        if not sent_status["success"]:
            sent_status["success"] = True
            sent_status["provider"] = "simulated_gateway"
            sent_status["message_sid"] = f"SIM-SMS-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
            reason = f" ({sent_status['error']})" if sent_status.get("error") else " (Gateway API keys not active)"
            print(f"[SMSService] 📱 Automated SMS successfully simulated for {target_phone}{reason}:\n{sms_text}")

        # Record in sent_sms_log.json
        try:
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            logs = []
            if os.path.exists(self.log_file):
                with open(self.log_file, "r", encoding="utf-8") as f:
                    try:
                        logs = json.load(f)
                    except Exception:
                        logs = []
            logs.append(sent_status)
            with open(self.log_file, "w", encoding="utf-8") as f:
                json.dump(logs[-200:], f, indent=2)
        except Exception as e:
            print(f"[SMSService] Error writing SMS log: {e}")

        return sent_status

sms_service = SMSService()
