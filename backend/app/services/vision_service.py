import os
import base64
import json
import httpx
import cv2
from typing import List, Dict, Any

from app.core.config import settings


CIVIC_DEFECT_MAP = {
    "pothole": {
        "category": "Roads & Infrastructure",
        "subcategory": "Road Pothole & Surface Crater",
        "severity": "HIGH"
    },
    "garbage_overflow": {
        "category": "Sanitation & Waste",
        "subcategory": "Garbage Overflow & Waste Dump",
        "severity": "HIGH"
    },
    "water_leakage": {
        "category": "Water & Sewage",
        "subcategory": "Water Main Leakage & Drainage Overflow",
        "severity": "HIGH"
    },
    "damaged_streetlight": {
        "category": "Electrical & Power",
        "subcategory": "Damaged Streetlight & Exposed Wiring",
        "severity": "MEDIUM"
    },
    "illegal_parking": {
        "category": "Traffic & Safety",
        "subcategory": "Illegal Parking & Road Obstruction",
        "severity": "LOW"
    }
}


class VisionService:
    def __init__(self):
        self.yolo_model = None
        self._model_loaded = False

    def _ensure_model(self):
        """Lazy-loads the YOLOv8 model on first use (not at server startup)."""
        if self._model_loaded:
            return
        self._model_loaded = True
        try:
            import torch
            _orig_torch_load = torch.load
            def _custom_torch_load(*args, **kwargs):
                if 'weights_only' not in kwargs:
                    kwargs['weights_only'] = False
                return _orig_torch_load(*args, **kwargs)
            torch.load = _custom_torch_load

            from ultralytics import YOLO
            self.yolo_model = YOLO("yolov8n.pt")
            print("[VisionService] YOLOv8 model loaded successfully.")
        except Exception as e:
            print(f"[VisionService] YOLOv8 notice: {e}. Running in lightweight fallback mode.")

    def analyze_image(self, image_path: str, text_hint: str = "") -> List[Dict[str, Any]]:
        """
        Main Entry Point:
        Analyzes an image and returns detected defects with bounding boxes and confidence scores.
        
        Pipeline:
          1. Gemini Vision API (primary — accurate scene understanding)
          2. YOLOv8 (secondary — bounding box localization)
          3. Text fallback (last resort)
        """
        if not os.path.exists(image_path):
            return []

        img = cv2.imread(image_path)
        if img is None:
            return []

        h, w, _ = img.shape

        # ── Step 1: Gemini Vision Multimodal Analysis (PRIMARY) ─────────────────
        gemini_result = self._analyze_with_gemini_vision(image_path, text_hint)

        # ── Step 2: YOLOv8 Object Detection (for bounding boxes) ───────────────
        self._ensure_model()
        yolo_boxes = self._get_yolo_boxes(image_path, h, w)

        # ── Step 3: Fuse Results ───────────────────────────────────────────────
        if gemini_result:
            detected_class = gemini_result.get("detected_class", "pothole")
            confidence = gemini_result.get("confidence", 0.90)
            info = CIVIC_DEFECT_MAP.get(detected_class, CIVIC_DEFECT_MAP["pothole"])

            # Use YOLO bounding boxes if available, otherwise use Gemini's or centered fallback
            if yolo_boxes:
                bboxes = yolo_boxes
            elif gemini_result.get("bounding_box"):
                gb = gemini_result["bounding_box"]
                bboxes = [{
                    "x1": int(gb.get("x1", w * 0.15)),
                    "y1": int(gb.get("y1", h * 0.15)),
                    "x2": int(gb.get("x2", w * 0.85)),
                    "y2": int(gb.get("y2", h * 0.85))
                }]
            else:
                bboxes = [{"x1": int(w * 0.15), "y1": int(h * 0.15), "x2": int(w * 0.85), "y2": int(h * 0.85)}]

            return [{
                "detected_class": detected_class,
                "confidence": round(confidence, 3),
                "severity_level": info["severity"],
                "category": info["category"],
                "subcategory": info["subcategory"],
                "bounding_boxes": bboxes,
                "img_width": w,
                "img_height": h
            }]

        # ── Step 4: YOLOv8-only classification (if Gemini unavailable) ─────────
        if self.yolo_model:
            detections = self._yolo_classify(image_path, text_hint, h, w)
            if detections:
                return detections

        # ── Step 5: Text-only fallback ─────────────────────────────────────────
        detected_class = self._infer_class_from_text(text_hint)
        info = CIVIC_DEFECT_MAP.get(detected_class, CIVIC_DEFECT_MAP["pothole"])
        box = {
            "x1": int(w * 0.20),
            "y1": int(h * 0.20),
            "x2": int(w * 0.80),
            "y2": int(h * 0.80)
        }
        return [{
            "detected_class": detected_class,
            "confidence": 0.85,
            "severity_level": info["severity"],
            "category": info["category"],
            "subcategory": info["subcategory"],
            "bounding_boxes": [box],
            "img_width": w,
            "img_height": h
        }]

    # ──────────────────────────────────────────────────────────────────────────
    # Gemini Vision Multimodal Analysis (PRIMARY classifier)
    # ──────────────────────────────────────────────────────────────────────────
    def _analyze_with_gemini_vision(self, image_path: str, text_hint: str = "") -> Dict[str, Any] | None:
        """
        Sends the actual image to Gemini Vision API for accurate scene classification.
        This is the PRIMARY classifier — it actually sees the image content.
        """
        gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if not gemini_key or len(gemini_key) < 5:
            return None

        try:
            # Read and encode image as base64
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            
            # Limit image size to 4MB for API
            if len(image_bytes) > 4 * 1024 * 1024:
                img = cv2.imread(image_path)
                if img is not None:
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                    _, encoded = cv2.imencode('.jpg', img, encode_param)
                    image_bytes = encoded.tobytes()

            image_b64 = base64.b64encode(image_bytes).decode("utf-8")

            # Detect MIME type
            ext = os.path.splitext(image_path)[1].lower()
            mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
            mime_type = mime_map.get(ext, "image/jpeg")

            text_context = f'\nCitizen complaint text: "{text_hint}"' if text_hint.strip() else ""

            prompt = f"""You are an expert municipal civic infrastructure defect inspector analyzing a citizen-uploaded photograph from an Indian city.

LOOK AT THE IMAGE CAREFULLY and classify the PRIMARY civic problem visible.{text_context}

You MUST classify the image into EXACTLY ONE of these categories:
- "garbage_overflow" — Garbage, trash, waste, overflowing dustbins, litter, solid waste dumps, debris piles, plastic waste
- "pothole" — Road potholes, craters, damaged road surface, broken asphalt, road cracks
- "water_leakage" — Water pipeline leaks, drainage overflow, sewage overflow, waterlogging, flooded roads
- "damaged_streetlight" — Broken streetlights, fallen poles, exposed electrical wiring, non-functioning lights
- "illegal_parking" — Unauthorized vehicle parking, road obstructions, traffic blockages

IMPORTANT RULES:
- Focus on WHAT YOU SEE in the image, not just the text.
- If you see garbage bins, waste, trash, dustbins, litter, or debris → classify as "garbage_overflow"
- If you see vehicles near garbage, the problem is STILL "garbage_overflow", NOT "illegal_parking"
- If you see water near garbage, the problem is STILL "garbage_overflow" unless water is clearly the main issue
- Assign confidence between 0.80 and 0.99 based on how clearly the defect is visible

Return ONLY valid JSON (no markdown, no backticks):
{{"detected_class": "one_of_the_five_classes", "confidence": 0.95, "description": "brief description of what you see"}}"""

            for model in ["gemini-2.0-flash", "gemini-1.5-flash"]:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
                    payload = {
                        "contents": [{
                            "parts": [
                                {"text": prompt},
                                {
                                    "inlineData": {
                                        "mimeType": mime_type,
                                        "data": image_b64
                                    }
                                }
                            ]
                        }],
                        "generationConfig": {
                            "temperature": 0.1,
                            "responseMimeType": "application/json"
                        }
                    }

                    with httpx.Client(timeout=5.0) as client:
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
                                    result = json.loads(clean)
                                    detected = result.get("detected_class", "")
                                    if detected in CIVIC_DEFECT_MAP:
                                        print(f"[VisionService] Gemini Vision classified: {detected} ({result.get('confidence', 0):.0%}) — {result.get('description', '')}")
                                        return result
                        else:
                            print(f"[VisionService] Gemini Vision {model} returned {res.status_code}")
                except Exception as e:
                    print(f"[VisionService] Gemini Vision {model} error: {e}")
                    continue

        except Exception as e:
            print(f"[VisionService] Gemini Vision pipeline error: {e}")

        return None

    # ──────────────────────────────────────────────────────────────────────────
    # YOLOv8 Helpers
    # ──────────────────────────────────────────────────────────────────────────
    def _get_yolo_boxes(self, image_path: str, h: int, w: int) -> List[Dict[str, int]]:
        """Extract bounding boxes from YOLOv8 detections (for localization only)."""
        if not self.yolo_model:
            return []
        try:
            results = self.yolo_model(image_path, verbose=False)
            boxes = []
            for r in results:
                for box in r.boxes:
                    conf = float(box.conf[0])
                    if conf >= 0.25:
                        xyxy = [int(v) for v in box.xyxy[0].tolist()]
                        boxes.append({"x1": xyxy[0], "y1": xyxy[1], "x2": xyxy[2], "y2": xyxy[3]})
            return boxes
        except Exception as e:
            print(f"[VisionService] YOLO box extraction error: {e}")
            return []

    def _yolo_classify(self, image_path: str, text_hint: str, h: int, w: int) -> List[Dict[str, Any]]:
        """Full YOLOv8 classification pipeline (used only when Gemini is unavailable)."""
        detections = []
        try:
            results = self.yolo_model(image_path, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = self.yolo_model.names.get(cls_id, "object")
                    conf = float(box.conf[0])
                    xyxy = [int(v) for v in box.xyxy[0].tolist()]

                    detected_class = self._map_yolo_to_civic_class(cls_name, text_hint)
                    info = CIVIC_DEFECT_MAP.get(detected_class, CIVIC_DEFECT_MAP["pothole"])

                    detections.append({
                        "detected_class": detected_class,
                        "confidence": round(conf, 3),
                        "severity_level": info["severity"],
                        "category": info["category"],
                        "subcategory": info["subcategory"],
                        "bounding_boxes": [{"x1": xyxy[0], "y1": xyxy[1], "x2": xyxy[2], "y2": xyxy[3]}],
                        "img_width": w,
                        "img_height": h
                    })
        except Exception as e:
            print(f"[VisionService] YOLO classify error: {e}")
        return detections

    # ──────────────────────────────────────────────────────────────────────────
    # Text-based Classification Helpers (Fallback)
    # ──────────────────────────────────────────────────────────────────────────
    def _map_yolo_to_civic_class(self, yolo_label: str, text_hint: str) -> str:
        label = yolo_label.lower()
        text_lower = text_hint.lower() if text_hint else ""

        # High-priority text override if citizen explicitly describes waste / dustbin
        if any(w in text_lower for w in ["garbage", "trash", "waste", "dustbin", "kachra", "chetha", "kuppa", "dump", "bin", "litter", "overflowing"]):
            return "garbage_overflow"
        # Only classify as water if NO waste context is present
        has_waste_context = any(w in text_lower for w in ["garbage", "trash", "waste", "dustbin", "bin", "kachra", "chetha", "kuppa", "dump"])
        if not has_waste_context and any(w in text_lower for w in ["water", "sewage", "drainage", "sewer", "pipeline", "neelu", "pani", "tap", "leaking"]):
            return "water_leakage"
        if any(w in text_lower for w in ["pothole", "crater", "road", "gadda", "guntha"]):
            return "pothole"
        if any(w in text_lower for w in ["streetlight", "light", "lamp", "pole", "wire", "batti"]):
            return "damaged_streetlight"
        if any(w in text_lower for w in ["park", "parking", "traffic", "jam", "gaadi"]):
            return "illegal_parking"

        if label in ["car", "truck", "bus", "motorcycle"]:
            return "illegal_parking" if "park" in text_lower else "pothole"
        if label in ["bottle", "cup", "trash", "bin", "bag", "handbag", "backpack", "box", "bowl"]:
            return "garbage_overflow"
        return self._infer_class_from_text(text_hint)

    def _infer_class_from_text(self, text_hint: str) -> str:
        text = (text_hint or "").lower()
        
        # 1. Solid Waste & Sanitation (checked before general leaks!)
        if any(w in text for w in ["garbage", "trash", "waste", "dustbin", "chetha", "kachra", "kuppa", "dump", "bin", "litter", "debris", "plastic", "stench", "badboo", "overflowing"]):
            return "garbage_overflow"
        
        # 2. Water & Sewage (requires water/sewer context)
        has_waste = any(w in text for w in ["garbage", "trash", "waste", "dustbin", "bin", "kachra", "chetha", "kuppa", "dump"])
        if not has_waste and any(w in text for w in ["water", "sewage", "drainage", "sewer", "pipeline", "pipe leak", "neelu", "pani", "gutter", "manhole", "tap", "drinking water", "leaking"]):
            return "water_leakage"
        
        # 3. Roads & Potholes
        if any(w in text for w in ["pothole", "potholes", "crater", "road", "gadda", "guntha", "asphalt", "cavity", "divider"]):
            return "pothole"
        
        # 4. Electrical & Streetlights
        if any(w in text for w in ["streetlight", "light", "dark", "pole", "wire", "batti", "lamp", "darkness", "transformer"]):
            return "damaged_streetlight"
        
        # 5. Traffic & Parking
        if any(w in text for w in ["park", "parking", "traffic", "jam", "gaadi", "obstruction", "blocked"]):
            return "illegal_parking"
            
        return "pothole"


vision_service = VisionService()
