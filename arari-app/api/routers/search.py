"""
Search Router - Advanced search endpoints
"""
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends

from database import get_db
from search import SearchService

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/employees")
async def search_employees_get(
    q: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 50,
    db: sqlite3.Connection = Depends(get_db)
):
    """Advanced employee search"""
    service = SearchService(db)
    return service.search_employees(
        query=q, sort_by=sort_by, sort_order=sort_order,
        page=page, page_size=page_size
    )


@router.post("/employees")
async def search_employees_post(
    payload: dict,
    db: sqlite3.Connection = Depends(get_db)
):
    """Advanced employee search with filters"""
    service = SearchService(db)
    return service.search_employees(
        query=payload.get("query"),
        filters=payload.get("filters"),
        sort_by=payload.get("sort_by"),
        sort_order=payload.get("sort_order", "asc"),
        page=payload.get("page", 1),
        page_size=payload.get("page_size", 50)
    )


@router.get("/payroll")
async def search_payroll_records(
    q: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 50,
    db: sqlite3.Connection = Depends(get_db)
):
    """Advanced payroll search"""
    service = SearchService(db)
    return service.search_payroll(
        query=q, sort_by=sort_by, sort_order=sort_order,
        page=page, page_size=page_size
    )


@router.get("/anomalies")
async def find_anomalies(period: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """Find data anomalies"""
    service = SearchService(db)
    return service.find_anomalies(period)


@router.get("/suggestions")
async def get_suggestions(q: str, field: str = "all", db: sqlite3.Connection = Depends(get_db)):
    """Get search suggestions"""
    service = SearchService(db)
    return service.get_search_suggestions(q, field)


@router.get("/filters")
async def get_filter_options(db: sqlite3.Connection = Depends(get_db)):
    """Get available filter options"""
    service = SearchService(db)
    return service.get_filter_options()
