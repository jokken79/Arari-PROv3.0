"""
Arari PRO v3.0 - API Routers
Modular FastAPI routers for better organization
"""

from .employees import router as employees_router
from .payroll import router as payroll_router
from .statistics import router as statistics_router
from .settings import router as settings_router
from .additional_costs import router as additional_costs_router
from .companies import router as companies_router
from .auth import router as auth_router
from .alerts import router as alerts_router
from .reports import router as reports_router
from .audit import router as audit_router
from .budget import router as budget_router
from .notifications import router as notifications_router
from .search import router as search_router
from .validation import router as validation_router
from .backup import router as backup_router
from .roi import router as roi_router
from .cache import router as cache_router

__all__ = [
    "employees_router",
    "payroll_router",
    "statistics_router",
    "settings_router",
    "additional_costs_router",
    "companies_router",
    "auth_router",
    "alerts_router",
    "reports_router",
    "audit_router",
    "budget_router",
    "notifications_router",
    "search_router",
    "validation_router",
    "backup_router",
    "roi_router",
    "cache_router",
]
