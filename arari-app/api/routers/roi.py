"""
ROI Router - Return on Investment endpoints
"""
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends

from database import get_db
from roi import ROIService

router = APIRouter(prefix="/api/roi", tags=["roi"])


@router.get("/clients")
async def get_client_roi(
    company: Optional[str] = None,
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get ROI by client"""
    service = ROIService(db)
    return service.calculate_client_roi(company, period)


@router.get("/employees")
async def get_employee_roi(
    employee_id: Optional[str] = None,
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get ROI by employee"""
    service = ROIService(db)
    return service.calculate_employee_roi(employee_id, period)


@router.get("/summary")
async def get_roi_summary(period: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get ROI summary"""
    service = ROIService(db)
    return service.get_roi_summary(period)


@router.get("/trend")
async def get_roi_trend(months: int = 6, db: sqlite3.Connection = Depends(get_db)):
    """Get ROI trend"""
    service = ROIService(db)
    return service.get_roi_trend(months)


@router.get("/recommendations")
async def get_roi_recommendations(
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get ROI improvement recommendations"""
    service = ROIService(db)
    return service.get_recommendations(period)


@router.get("/compare")
async def compare_roi_periods(
    period1: str,
    period2: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """Compare ROI between two periods"""
    service = ROIService(db)
    return service.compare_periods(period1, period2)
