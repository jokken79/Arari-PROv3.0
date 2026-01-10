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

__all__ = [
    "employees_router",
    "payroll_router",
    "statistics_router",
    "settings_router",
    "additional_costs_router",
    "companies_router",
]
