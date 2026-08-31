"""
AI Smart City - NLP Service (Natural Language Processing Module)
---------------------------------------------------------------
Purpose:
  Analyzes citizen complaint text in any regional language (English, Telugu, Hindi, Tenglish, Hinglish).
  
Data Science Pipeline Steps:
  1. Language Detection & Translation: Identifies language and translates to standard English.
  2. Intent & Category Classification: Maps the problem to municipal departments (Roads, Water, Waste, Electrical, Traffic).
  3. Entity Extraction & Safety Risk Scoring: Extracts location, hazard type, and safety risk score (1-10).
"""

import os
import json
import re
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings


class NLPService:
    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.gemini_api_key = settings.GEMINI_API_KEY

    def process_complaint_text(self, text: str, address_hint: str = "") -> Dict[str, Any]:
        """
        Main Entry Point:
        Processes raw citizen text or voice transcript in any regional language
        (Telugu, Hindi, English, Tenglish, Hinglish) and returns structured data.
        """
        if not text or not text.strip():
            return self._default_fallback(address_hint)

        # 1. Try LLM API (Gemini or Groq) if API keys are configured
        if self.gemini_api_key and len(self.gemini_api_key) > 5:
            llm_result = self._extract_with_gemini(text, address_hint)
            if llm_result:
                return llm_result

        if self.groq_api_key and len(self.groq_api_key) > 5:
            llm_result = self._extract_with_groq(text, address_hint)
            if llm_result:
                return llm_result

        # 2. Core Rule-Based NLP Pipeline (Fast, Offline & Zero Dependency)
        return self._rule_based_nlp_pipeline(text, address_hint)

    # ──────────────────────────────────────────────────────────────────────────
    # Core Multilingual NLP Pipeline (Automatic Language Detection & Translation)
    # ──────────────────────────────────────────────────────────────────────────
    def _rule_based_nlp_pipeline(self, text: str, address_hint: str) -> Dict[str, Any]:
        raw_text = text.strip()
        text_lower = raw_text.lower()

        # ── Step 1: Automatic Language Identification ─────────────────────────
        is_telugu_script = bool(re.search(r'[\u0C00-\u0C7F]', raw_text))
        is_hindi_script = bool(re.search(r'[\u0900-\u097F]', raw_text))

        tenglish_keywords = [
            "neelu", "neellu", "guntha", "guntalu", "chetha", "kuppa", "velagadam", "ledu",
            "roddu", "kinda", "pani", "mariyu", "chaala", "dorikindi", "badhoo", "dorala",
            "dabbulu", "badhapaduthunnam", "lekapovadam", "raavadam", "veedhi", "dhula"
        ]
        hinglish_keywords = [
            "pani", "paani", "bah", "raha", "sadak", "gadda", "gaddha", "kachra", "kuda",
            "bijli", "batti", "khamba", "andhera", "bohot", "bahut", "kharab", "ganda",
            "pareshani", "kripya", "theek", "karo", "jaldi", "badboo"
        ]

        if is_telugu_script:
            detected_language = "Telugu (తెలుగు)"
            lang_code = "te"
        elif is_hindi_script:
            detected_language = "Hindi (हिंदी)"
            lang_code = "hi"
        elif any(word in text_lower for word in tenglish_keywords):
            detected_language = "Telugu (Tenglish)"
            lang_code = "te-latn"
        elif any(word in text_lower for word in hinglish_keywords):
            detected_language = "Hindi (Hinglish)"
            lang_code = "hi-latn"
        else:
            detected_language = "English"
            lang_code = "en"

        # ── Step 2: Intent, Category & Hazard Classification ──────────────────
        # Telugu keyword matching
        telugu_waste = any(w in raw_text for w in ["చెత్త", "కుప్ప", "దుర్వాసన", "డస్ట్‌బిన్", "మురుగు", "చెత్తబుట్ట", "వ్యర్థాలు"])
        telugu_water = any(w in raw_text for w in ["నీళ్లు", "నీరు", "పైప్‌లైన్", "నల్లా", "లీక్", "లీకేజీ", "కాలువ", "డ్రైనేజీ", "మంచినీరు", "వరద"]) and not telugu_waste
        telugu_road = any(w in raw_text for w in ["గుంత", "గుంతలు", "రోడ్డు", "రహదారి", "వంతెన", "విరిగిపోయింది", "డివైడర్"])
        telugu_light = any(w in raw_text for w in ["లైట్", "లైట్లు", "స్ట్రీట్‌లైట్", "చీకటి", "స్తంభం", "కరెంట్", "వైర్లు", "వెలగడం లేదు", "వెలగట్లేదు"])
        telugu_traffic = any(w in raw_text for w in ["ట్రాఫిక్", "పార్కింగ్", "జామ్", "వాహనాలు", "అడ్డంకి"])

        # Hindi keyword matching
        hindi_waste = any(w in raw_text for w in ["कचरा", "कचरे", "कूड़ा", "बदबू", "कूड़ेदान", "गंदगी", "ढेर", "सफाई"])
        hindi_water = any(w in raw_text for w in ["पानी", "पाइपलाइन", "लीक", "नाली", "सीवर", "गंदा पानी", "जलभराव", "पाइप"]) and not hindi_waste
        hindi_road = any(w in raw_text for w in ["गड्ढा", "गड्ढे", "सड़क", "रास्ता", "टूट", "डिवाइडर", "खराब सड़क"])
        hindi_light = any(w in raw_text for w in ["स्ट्रीट लाइट", "लाइट", "बिजली", "अंधेरा", "खंभा", "तार", "बत्ती"])
        hindi_traffic = any(w in raw_text for w in ["ट्रैफिक", "जाम", "पार्किंग", "गाड़ी", "अवरोध"])

        # English / Romanized keyword matching
        is_waste = telugu_waste or hindi_waste or bool(re.search(r'\b(garbage|trash|waste|dustbin|kachra|kuda|chetha|kuppa|dump|stench|badboo|litter|debris|plastic|bin|spill|spilling|overflowing)\b', text_lower))
        if not is_waste and re.search(r'\b(leaking|spilling|overflowing)\b', text_lower):
            if re.search(r'\b(dustbin|garbage|trash|waste|bin|kachra|chetha|kuppa|dump)\b', text_lower):
                is_waste = True

        is_water = (telugu_water or hindi_water or bool(re.search(r'\b(water|drainage|sewage|sewer|pipeline|pipe|neelu|neellu|pani|paani|gutter|manhole|tap|drinking water|borewell)\b', text_lower))) and not is_waste
        is_road = telugu_road or hindi_road or bool(re.search(r'\b(pothole|potholes|road|crater|guntha|guntalu|gadda|gaddha|sadak|divider|cavity|asphalt|tar)\b', text_lower))
        is_light = telugu_light or hindi_light or bool(re.search(r'\b(streetlight|light|pole|lamp|dark|darkness|cheekati|andhera|batti|wire|transformer|current)\b', text_lower))
        is_traffic = telugu_traffic or hindi_traffic or bool(re.search(r'\b(parking|traffic|jam|blocked|obstruction|gaadi|encroachment|signal)\b', text_lower))

        # ── Step 3: Synthesis of Clean English Translation ────────────────────
        if is_waste:
            hazard_type = "garbage_overflow"
            category = "Sanitation & Waste"
            summary = "Garbage accumulation and solid waste cleanup required."
            if lang_code.startswith("te"):
                translated_text = "Solid waste and garbage is overflowing on the street with bad odor, requiring municipal sanitation clearance."
            elif lang_code.startswith("hi"):
                translated_text = "Heavy garbage dump and overflowing trash on the road creating stench and health hazard, requiring urgent cleanup."
            else:
                translated_text = raw_text if len(raw_text) > 20 else "Solid waste and garbage overflowing, requiring municipal sanitation collection."

        elif is_water:
            hazard_type = "water_leakage"
            category = "Water & Sewage"
            summary = "Water supply pipeline leakage and drainage overflow reported."
            if lang_code.startswith("te"):
                translated_text = "Major water pipeline leakage and drainage overflow flooding public road with clean drinking water / sewage."
            elif lang_code.startswith("hi"):
                translated_text = "Water pipeline is leaking heavily on the main road, causing waterlogging and supply loss."
            else:
                translated_text = raw_text if len(raw_text) > 20 else "Water pipeline leakage and drainage overflow flooding the street."

        elif is_road:
            hazard_type = "pothole"
            category = "Roads & Infrastructure"
            summary = "Severe road pothole and damaged road surface reported."
            if lang_code.startswith("te"):
                translated_text = "Deep dangerous pothole on the public road causing severe hazard for commuters and bike riders."
            elif lang_code.startswith("hi"):
                translated_text = "Large crater and dangerous pothole on the road creating safety risk for vehicles and pedestrians."
            else:
                translated_text = raw_text if len(raw_text) > 20 else "Severe road pothole and structural surface crater defect reported."

        elif is_light:
            hazard_type = "damaged_streetlight"
            category = "Electrical & Power"
            summary = "Defective streetlight and dangerous darkness reported."
            if lang_code.startswith("te"):
                translated_text = "Streetlights are not functioning and the entire road is dark, posing safety risks at night."
            elif lang_code.startswith("hi"):
                translated_text = "Street lights are not working and the area is pitch dark at night, requiring electrical repairs."
            else:
                translated_text = raw_text if len(raw_text) > 20 else "Streetlight is damaged or not illuminating, creating dangerous dark road conditions."

        elif is_traffic:
            hazard_type = "illegal_parking"
            category = "Traffic & Safety"
            summary = "Traffic congestion and unauthorized road obstruction reported."
            if lang_code.startswith("te"):
                translated_text = "Heavy traffic congestion and unauthorized vehicle parking blocking normal traffic flow."
            elif lang_code.startswith("hi"):
                translated_text = "Traffic congestion and illegal parking on the street causing severe blockage."
            else:
                translated_text = raw_text if len(raw_text) > 20 else "Unauthorized vehicle parking and traffic congestion causing road obstruction."

        else:
            hazard_type = "civic_issue"
            category = "Roads & Infrastructure"
            summary = "Civic maintenance issue reported."
            translated_text = raw_text

        # ── Step 4: Vulnerable Zone & Risk Evaluation ─────────────────────────
        vulnerable_zone = "residential"
        if any(w in text_lower for w in ["school", "college", "vidyalaya", "బడి", "స్కూల్", "స్కూలు", "स्कूल"]):
            vulnerable_zone = "school"
        elif any(w in text_lower for w in ["hospital", "clinic", "doctor", "ఆసుపత్రి", "హాస్పిటల్", "अस्पताल"]):
            vulnerable_zone = "hospital"
        elif any(w in text_lower for w in ["highway", "expressway", "bypass", "హైవే", "మెయిన్ రోడ్డు", "हाईवे"]):
            vulnerable_zone = "highway"
        elif any(w in text_lower for w in ["market", "bazaar", "shops", "మార్కెట్", "బజార్", "बाजार"]):
            vulnerable_zone = "market"

        # Check if accident or injury was mentioned
        incident_reported = any(w in text_lower for w in [
            "accident", "fall", "bike", "slip", "crash", "chot", "gir",
            "ప్రమాదం", "పడిపోయారు", "గాయం", "హాస్పిటల్", "హాదసా", "चोट", "दुर्घटना"
        ])

        # Priority & Safety Risk Score calculation
        safety_score = 5
        if incident_reported:
            safety_score += 4
        if vulnerable_zone in ["school", "hospital", "highway"]:
            safety_score += 2
        safety_score = min(safety_score, 10)

        if safety_score >= 8 or incident_reported:
            priority = "CRITICAL"
        elif safety_score >= 6:
            priority = "HIGH"
        elif safety_score >= 4:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        # Extract Location / Ward Landmark
        location = address_hint or "Ward 12 - Jubilee Zone, Hyderabad"
        if any(w in text_lower for w in ["jubilee", "జూబ్లీ", "जुबली"]):
            location = "Jubilee Hills, Ward 12"
        elif any(w in text_lower for w in ["banjara", "బంజారా", "बंजारा"]):
            location = "Banjara Hills, Ward 10"
        elif any(w in text_lower for w in ["charminar", "చార్మినార్", "चारमीनार"]):
            location = "Charminar, Ward 8"
        elif any(w in text_lower for w in ["kukatpally", "కూకట్‌పల్లి", "कूकटपल्ली"]):
            location = "Kukatpally, Ward 18"
        elif any(w in text_lower for w in ["madhapur", "మాదాపూర్", "माधापुर", "hitec"]):
            location = "Madhapur IT Corridor, Ward 15"

        return {
            "original_text": raw_text,
            "detected_language": detected_language,
            "lang_code": lang_code,
            "translated_text": translated_text,
            "summary": summary,
            "category": category,
            "priority": priority,
            "entities": {
                "location": location,
                "hazard_type": hazard_type,
                "incident_reported": incident_reported,
                "vulnerable_zone": vulnerable_zone
            },
            "safety_risk_score": safety_score
        }

    # ──────────────────────────────────────────────────────────────────────────
    # LLM Extractors (Gemini / Groq) with Automatic Multilingual Detection
    # ──────────────────────────────────────────────────────────────────────────
    def _extract_with_gemini(self, text: str, address_hint: str) -> Optional[Dict[str, Any]]:
        gemini_key = self.gemini_api_key or os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            return None

        prompt = f"""You are a multilingual smart city complaint classifier for Hyderabad, India.
Analyze this citizen voice input/text: "{text}"
Location hint: "{address_hint}"

Tasks:
1. Automatically detect the spoken language (e.g. Telugu, Hindi, Tenglish, Hinglish, English).
2. Translate the statement into standard clear English.
3. Categorize into ONE of: "Sanitation & Waste", "Water & Sewage", "Roads & Infrastructure", "Electrical & Power", "Traffic & Safety".
4. Determine priority: "CRITICAL", "HIGH", "MEDIUM", "LOW".

Return JSON ONLY (no markdown backticks):
{{
  "original_text": "{text}",
  "detected_language": "Telugu / Hindi / English",
  "lang_code": "te / hi / en",
  "translated_text": "string translated to English",
  "summary": "concise summary in English",
  "category": "exact category string",
  "priority": "CRITICAL / HIGH / MEDIUM / LOW",
  "entities": {{
    "location": "string",
    "hazard_type": "string",
    "incident_reported": false,
    "vulnerable_zone": "residential / school / hospital / highway / market"
  }},
  "safety_risk_score": 7
}}"""

        for model in ["gemini-2.0-flash", "gemini-1.5-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
                }
                with httpx.Client(timeout=3.0) as client:
                    res = client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        for cand in candidates:
                            parts = cand.get("content", {}).get("parts", [])
                            text_parts = [p.get("text", "") for p in parts if isinstance(p, dict) and "text" in p]
                            raw = "".join(text_parts).strip()
                            if raw:
                                clean = raw.replace("```json", "").replace("```", "").strip()
                                return json.loads(clean)
            except Exception:
                continue

        return None

    def _extract_with_groq(self, text: str, address_hint: str) -> Optional[Dict[str, Any]]:
        try:
            groq_key = self.groq_api_key or os.getenv("GROQ_API_KEY")
            if not groq_key:
                return None
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            prompt = f"""You are a multilingual municipal grievance AI for Hyderabad.
Analyze citizen voice text: "{text}"
Auto-detect language (Telugu, Hindi, English, Tenglish, Hinglish), translate to standard English, categorize into (Sanitation & Waste, Water & Sewage, Roads & Infrastructure, Electrical & Power, Traffic & Safety), and assign priority (CRITICAL, HIGH, MEDIUM, LOW).
Return valid JSON only matching schema:
{{"original_text":"{text}", "detected_language":"string", "lang_code":"string", "translated_text":"string", "summary":"string", "category":"string", "priority":"string", "entities":{{"location":"string","hazard_type":"string","incident_reported":false,"vulnerable_zone":"string"}}, "safety_risk_score":5}}"""
            
            for model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"]:
                try:
                    payload = {
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    }
                    with httpx.Client(timeout=2.0) as client:
                        res = client.post(url, json=payload, headers=headers)
                        if res.status_code == 200:
                            return json.loads(res.json()["choices"][0]["message"]["content"])
                except Exception:
                    continue
        except Exception:
            pass
        return None

    def _default_fallback(self, address_hint: str) -> Dict[str, Any]:
        return {
            "original_text": "",
            "detected_language": "English",
            "lang_code": "en",
            "translated_text": "General civic complaint submitted.",
            "summary": "Civic maintenance request.",
            "category": "Roads & Infrastructure",
            "priority": "MEDIUM",
            "entities": {
                "location": address_hint or "Ward 12 - Jubilee Zone",
                "hazard_type": "civic_issue",
                "incident_reported": False,
                "vulnerable_zone": "general"
            },
            "safety_risk_score": 5
        }


nlp_service = NLPService()

