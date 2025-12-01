#!/usr/bin/env python3
"""
粗利 PRO - Profit Margin Management System
派遣社員の利益率・マージン計算アプリ

A professional dashboard for tracking dispatch employee profit margins.
"""

from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
from datetime import datetime

from database import (
    get_all_haken_employees,
    get_profit_by_company,
    get_monthly_profit,
    get_statistics,
    get_available_periods
)

# Initialize FastAPI
app = FastAPI(
    title="粗利 PRO",
    description="派遣社員利益率管理システム - Dispatch Employee Profit Management",
    version="1.0.0"
)

# Templates
templates_dir = os.path.join(os.path.dirname(__file__), "templates")
os.makedirs(templates_dir, exist_ok=True)
templates = Jinja2Templates(directory=templates_dir)

# ========================================
# STARTUP
# ========================================

@app.on_event("startup")
async def startup_event():
    """Initialize application"""
    print("[OK] 粗利 PRO v1.0.0 起動中...")
    try:
        stats = get_statistics()
        print(f"[OK] データベース接続成功: {stats['total_employees']}名の従業員")
        print(f"[OK] 平均粗利: {stats['avg_arari']:,.0f}円/時 (マージン率: {stats['avg_margin_rate']:.1f}%)")
    except Exception as e:
        print(f"[WARNING] データベース接続エラー: {e}")
    print("[OK] 粗利 PRO 準備完了!")

# ========================================
# MAIN PAGES
# ========================================

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main dashboard page"""
    return templates.TemplateResponse("index.html", {
        "request": request,
        "title": "粗利 PRO - ダッシュボード"
    })

# ========================================
# API ENDPOINTS
# ========================================

@app.get("/api/statistics")
async def api_statistics():
    """Get overall statistics"""
    try:
        stats = get_statistics()
        return JSONResponse(stats)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/employees")
async def api_employees():
    """Get all employees with profit data"""
    try:
        employees = get_all_haken_employees()
        return JSONResponse(employees)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/companies")
async def api_companies():
    """Get profit by company"""
    try:
        companies = get_profit_by_company()
        return JSONResponse(companies)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/monthly")
async def api_monthly(year: int = Query(None), month: int = Query(None)):
    """Get monthly profit calculation"""
    try:
        data = get_monthly_profit(year, month)
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/periods")
async def api_periods():
    """Get available periods"""
    try:
        periods = get_available_periods()
        return JSONResponse(periods)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        stats = get_statistics()
        return JSONResponse({
            "status": "healthy",
            "version": "1.0.0",
            "employees": stats['total_employees'],
            "avg_margin": f"{stats['avg_margin_rate']:.1f}%",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return JSONResponse({
            "status": "error",
            "error": str(e)
        }, status_code=500)

# ========================================
# RUN
# ========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8990)
