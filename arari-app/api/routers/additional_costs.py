"""
Additional Costs Router - 追加コスト management
"""
import sqlite3
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from additional_costs import COST_TYPES as ADDITIONAL_COST_TYPES
from additional_costs import AdditionalCostsService
from auth_dependencies import log_action, require_admin, require_auth
from database import get_db

router = APIRouter(prefix="/api/additional-costs", tags=["additional-costs"])


class AdditionalCostCreate(BaseModel):
    dispatch_company: str
    period: str
    cost_type: str
    amount: float
    notes: Optional[str] = None


class AdditionalCostUpdate(BaseModel):
    cost_type: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None


@router.get("")
async def get_additional_costs(
    db: sqlite3.Connection = Depends(get_db),
    company: Optional[str] = None,
    period: Optional[str] = None
):
    """Get all additional costs with optional filtering"""
    service = AdditionalCostsService(db)
    return service.get_all_costs(company=company, period=period)


@router.get("/types")
async def get_additional_cost_types():
    """Get available cost types"""
    return ADDITIONAL_COST_TYPES


@router.get("/summary")
async def get_additional_costs_summary(
    db: sqlite3.Connection = Depends(get_db),
    period: Optional[str] = None
):
    """Get summary of costs grouped by company"""
    service = AdditionalCostsService(db)
    return service.get_companies_with_costs(period=period)


@router.get("/company/{company_name}/total")
async def get_company_total_costs(
    company_name: str,
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get total additional costs for a company"""
    service = AdditionalCostsService(db)
    total = service.get_total_costs_by_company(company_name, period)
    return {"company": company_name, "period": period, "total_additional_costs": total}


@router.get("/{cost_id}")
async def get_additional_cost(
    cost_id: int,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get a single additional cost by ID"""
    service = AdditionalCostsService(db)
    cost = service.get_cost(cost_id)
    if not cost:
        raise HTTPException(status_code=404, detail="Cost not found")
    return cost


@router.post("")
async def create_additional_cost(
    cost: AdditionalCostCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Create a new additional cost (requires authentication)"""
    service = AdditionalCostsService(db)
    result = service.create_cost(
        dispatch_company=cost.dispatch_company,
        period=cost.period,
        cost_type=cost.cost_type,
        amount=cost.amount,
        notes=cost.notes,
        created_by=current_user.get("username")
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    log_action(db, current_user, "create", "additional_cost",
               f"{cost.dispatch_company}_{cost.period}", f"Created cost: {cost.cost_type} = ¥{cost.amount}")
    return result


@router.put("/{cost_id}")
async def update_additional_cost(
    cost_id: int,
    cost: AdditionalCostUpdate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Update an additional cost (requires authentication)"""
    service = AdditionalCostsService(db)
    result = service.update_cost(cost_id, **cost.dict(exclude_none=True))
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    log_action(db, current_user, "update", "additional_cost", str(cost_id), "Updated cost")
    return result


@router.delete("/{cost_id}")
async def delete_additional_cost(
    cost_id: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete an additional cost (requires admin)"""
    service = AdditionalCostsService(db)
    result = service.delete_cost(cost_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    log_action(db, current_user, "delete", "additional_cost", str(cost_id), "Deleted cost")
    return result


@router.post("/copy")
async def copy_additional_costs(
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Copy costs from one period to another"""
    service = AdditionalCostsService(db)
    result = service.copy_costs_to_period(
        source_period=payload.get("source_period"),
        target_period=payload.get("target_period"),
        company=payload.get("company"),
        adjust_percent=payload.get("adjust_percent", 0)
    )
    log_action(db, current_user, "copy", "additional_cost",
               f"{payload.get('source_period')}→{payload.get('target_period')}",
               f"Copied {result.get('copied', 0)} costs")
    return result
