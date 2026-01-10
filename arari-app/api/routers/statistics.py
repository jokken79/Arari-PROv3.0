"""
Statistics Router - Dashboard and analytics endpoints
"""
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends

from database import get_db
from services import PayrollService

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


@router.get("")
async def get_statistics(
    db: sqlite3.Connection = Depends(get_db),
    period: Optional[str] = None
):
    """Get dashboard statistics"""
    service = PayrollService(db)
    return service.get_statistics(period=period)


@router.get("/monthly")
async def get_monthly_statistics(
    db: sqlite3.Connection = Depends(get_db),
    year: Optional[int] = None,
    month: Optional[int] = None
):
    """Get monthly statistics"""
    service = PayrollService(db)
    return service.get_monthly_statistics(year=year, month=month)


@router.get("/companies")
async def get_company_statistics(db: sqlite3.Connection = Depends(get_db)):
    """Get statistics by company"""
    service = PayrollService(db)
    return service.get_company_statistics()


@router.get("/trend")
async def get_profit_trend(
    db: sqlite3.Connection = Depends(get_db),
    months: int = 6
):
    """Get profit trend for last N months"""
    service = PayrollService(db)
    return service.get_profit_trend(months=months)
