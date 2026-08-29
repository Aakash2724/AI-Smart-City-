# AI Smart City Complaint Management & Predictive Analytics Platform

An end-to-end civic grievance automation platform built using **FastAPI**, **React (Vite)**, **YOLOv8 computer vision**, and a **LangGraph multi-agent pipeline**.

The platform automates the entire citizen grievance lifecycle: from real-time visual defect detection and multilingual voice transcription to intelligent departmental routing, risk-weighted SLA priority assessment, and ward-level predictive risk forecasting.

---

## 📌 Why I Built This

Municipal grievance portals are often slow, require manual triage by city staff, and lack visual proof validation. Citizens frequently face long delays, duplicate complaints get lost in queues, and municipal departments struggle to prioritize critical public safety hazards.

I developed this system to solve these bottlenecks by combining computer vision with LLM multi-agent orchestration:
1. **Automate visual verification** of infrastructure issues (potholes, garbage dumps, broken streetlights, water pipeline leaks) using YOLOv8.
2. **Eliminate language barriers** by supporting Telugu, Hindi, English, and transliterated mixed text (Tenglish / Hinglish) along with speech-to-text.
3. **Automate priority and routing decisions** using a 5-factor risk scoring engine and LangGraph agents.
4. **Empower city administrators** with real-time GIS cluster heatmaps and 7-day predictive risk forecasts for proactive dispatch.

---

## 🚀 Key Features

### 1. Citizen Portal & Multi-Modal Reporting
- **Image Upload & Real-Time Computer Vision**: Automatic defect classification and bounding box localization using YOLOv8.
- **Multilingual Speech & Text Input**: Built-in voice dictation with automatic language detection and translation (English, Hindi, Telugu).
- **Interactive Map Pinning**: Leaflet-based GPS coordinate selector with automatic address geocoding.
- **Real-Time Ticket Tracking**: Live SLA countdown, assigned department head details, direct email/phone escalation contacts, and status timeline.
- **Automated Email Notifications**: Real-time confirmation emails dispatched via SMTP with ticket deep-links.

### 2. Multi-Agent Decision Engine (LangGraph)
- **Classification Agent**: Categorizes grievances across municipal departments (Roads, Sanitation, Water Works, Electrical, Traffic).
- **Priority Assessment Agent**: Evaluates safety risks, visual severity, location density, and SLA policy to assign priority tiers (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Routing Agent**: Assigns complaints to specific zonal engineers and designated municipal heads.
- **Response Directive Agent**: Synthesizes citizen-facing verification reports and internal government work order directives (`#WO-...`).

### 3. Admin Command Center & Predictive Analytics
- **Live Municipal KPI Dashboard**: Real-time resolution metrics, department workload distribution, and category breakdowns.
- **GIS Risk Radar & Heatmap**: Interactive geospatial map plotting active complaint clusters across Greater Hyderabad municipal wards.
- **7-Day Predictive Risk Forecast**: Regression-based trend models forecasting future civic issue spikes by ward and weather risk.
- **AI Municipal Copilot**: Natural language query assistant for municipal administrators to interrogate city database records and generate operational summaries.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Python 3.11, FastAPI, Uvicorn
- **AI / ML**: Ultralytics YOLOv8, OpenCV, Pillow
- **LLM & Multi-Agent Orchestration**: LangGraph, Groq SDK (Llama 3.3 / Qwen), Google Gemini API
- **Database & ORM**: SQLAlchemy, SQLite (production compatible with PostgreSQL)
- **Email Dispatch**: Python `smtplib` (Gmail / Custom SMTP), Resend API

### Frontend
- **Framework**: React 18, Vite
- **Styling**: Tailwind CSS, Tabler Icons, Lucide React
- **Geospatial & Charts**: Leaflet, React-Leaflet, Chart.js, React-Chartjs-2
- **State & Routing**: React Context API, Axios

---

## 📂 Project Structure

```text
AI-Smart-City/
├── backend/
│   ├── app/
│   │   ├── agents/            # LangGraph multi-agent workflow & state definitions
│   │   ├── api/v1/endpoints/  # FastAPI REST endpoints (complaints, analytics, auth, NLP)
│   │   ├── core/              # Database session, config, and environment setup
│   │   ├── models/            # SQLAlchemy database models & Pydantic schemas
│   │   ├── services/          # Vision detection, LLM, RAG, NLP & email services
│   │   ├── main.py            # FastAPI application entry point & static file mounts
│   │   └── seed_data.py       # Seed data for municipal heads, wards, and complaints
│   ├── requirements.txt       # Python backend dependencies
│   └── yolov8n.pt             # Pre-trained YOLOv8 vision model weights
│
├── frontend/
│   ├── public/                # Static assets, officer portraits, and map markers
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/         # SmartCityDashboard, GISHotspotMap, RiskForecastPanel, AICopilot
│   │   │   ├── auth/          # AuthPage, LoginModal
│   │   │   ├── citizen/       # ComplaintForm, TrackHistory, ProfileSettingsPage
│   │   │   └── common/        # Header, Sidebar, NotificationsModal, CopyTicketButton
│   │   ├── context/           # AuthContext & global state management
│   │   ├── services/          # Axios API client functions
│   │   ├── App.jsx            # Main application layout & view switcher
│   │   └── index.css          # Design system, custom Leaflet styling & scrollbars
│   ├── package.json           # Node.js dependencies & build scripts
│   └── vite.config.js         # Vite bundler configuration
│
├── .env.example               # Environment variables configuration template
├── .gitignore                 # Git ignore rules for virtual environments & secrets
└── README.md                  # Project documentation
```

---

## ⚙️ Setup & Installation

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**
- (Optional) API keys for **Groq**, **Google Gemini**, or **OpenAI**

---

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env` inside `backend/`:
     ```bash
     cp ../.env.example .env
     ```
   - Add your API keys (e.g. `GROQ_API_KEY`, `GEMINI_API_KEY`, or SMTP details for email notifications).

5. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend API will be live at `http://127.0.0.1:8000` (Interactive Swagger Docs: `http://127.0.0.1:8000/docs`).

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://127.0.0.1:5173`.

---

## 🔒 Security & Best Practices

- **Zero Hardcoded Secrets**: Sensitive API keys and credentials are read strictly from `.env` and kept out of version control.
- **Isolated Static Serving**: Uploaded media and detection assets are stored in dedicated local directories with strict MIME validation.
- **CORS & Rate Limits**: Configured CORS policies for frontend-to-backend communication.

---

## 👤 Author

- **Akash Meesala**
- Email: `aakashmeesala004@gmail.com`
- GitHub: [@Aakash2724](https://github.com/Aakash2724)
