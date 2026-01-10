"""
Budget Router - Budget management endpoints
"""
import sqlite3
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

from auth_dependencies import require_auth
from budget import BudgetService
from database import get_db

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("")
async def get_budgets(
    period: Optional[str] = None,
    entity_type: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get all budgets"""
    service = BudgetService(db)
    return service.get_budgets(period=period, entity_type=entity_type)


@router.post("")
async def create_budget(
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Create a new budget (requires authentication)"""
    service = BudgetService(db)
    result = service.create_budget(
        period=payload.get("period"),
        entity_type=payload.get("entity_type", "total"),
        entity_id=payload.get("entity_id"),
        budget_revenue=payload.get("budget_revenue", 0),
        budget_cost=payload.get("budget_cost", 0),
        budget_profit=payload.get("budget_profit"),
        budget_margin=payload.get("budget_margin"),
        notes=payload.get("notes"),
        created_by=payload.get("created_by")
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/compare/{period}")
async def compare_budget_vs_actual(
    period: str,
    entity_type: str = "total",
    entity_id: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Compare budget vs actual"""
    service = BudgetService(db)
    result = service.compare_budget_vs_actual(period, entity_type, entity_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.get("/summary")
async def get_budget_summary(year: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get budget summary for a year"""
    service = BudgetService(db)
    return service.get_budget_summary(year)


@router.delete("/{budget_id}")
async def delete_budget(
    budget_id: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Delete a budget (requires authentication)"""
    service = BudgetService(db)
    result = service.delete_budget(budget_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result
