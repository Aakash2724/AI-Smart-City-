# ============================================
# Backend Dockerfile - FastAPI + AI/ML Pipeline
# ============================================
# Optimized for ARM64 (Oracle Cloud Ampere A1)
# Supports: YOLOv8, LangChain, scikit-learn
# ============================================

FROM python:3.11-slim

# Install system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (Docker layer caching)
COPY requirements.docker.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ app/
COPY .env* ./

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Run the server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
