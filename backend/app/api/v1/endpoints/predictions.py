from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.services.predictive_service import predictive_service
from app.core.database import get_db

router = APIRouter(prefix="/predictions", tags=["Predictive Analytics Engine"])

@router.get("/forecast-volume")
def get_volume_forecast(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns 7-day complaint volume forecasts by category using live DB + ML model."""
    return predictive_service.forecast_weekly_volume(db=db)

@router.get("/gis-hotspots")
def get_gis_hotspots(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Returns predicted GIS complaint hotspot risk clusters and recommended preventive actions."""
    return predictive_service.generate_gis_hotspots(db=db)

@router.get("/7day-risk-forecast")
def get_7day_risk_forecast(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns a 7-day predictive risk forecast identifying high-risk areas based on historical complaint patterns."""
    return predictive_service.generate_7day_area_risk_forecast(db=db)

