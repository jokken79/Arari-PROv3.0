"""
Reports Router - Report generation and download endpoints
"""
import sqlite3
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from database import get_db
from reports import ReportService

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/monthly/{period}")
async def get_monthly_report_data(period: str, db: sqlite3.Connection = Depends(get_db)):
    """Get monthly report data"""
    service = ReportService(db)
    return service.get_monthly_report_data(period)


@router.get("/employee/{employee_id}")
async def get_employee_report_data(
    employee_id: str,
    months: int = 6,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get employee report data"""
    service = ReportService(db)
    return service.get_employee_report_data(employee_id, months)


@router.get("/company/{company}")
async def get_company_report_data(company: str, db: sqlite3.Connection = Depends(get_db)):
    """Get company report data"""
    service = ReportService(db)
    return service.get_company_report_data(company)


@router.get("/download/{report_type}")
async def download_report(
    report_type: str,
    period: Optional[str] = None,
    employee_id: Optional[str] = None,
    company: Optional[str] = None,
    format: str = "excel",
    db: sqlite3.Connection = Depends(get_db)
):
    """Download report as Excel or PDF"""
    try:
        service = ReportService(db)

        # Get report data based on report type
        if report_type == "monthly" and period:
            data = service.get_monthly_report_data(period)
        elif report_type == "employee" and employee_id:
            data = service.get_employee_report_data(employee_id)
        elif report_type == "company" and company:
            data = service.get_company_report_data(company)
        elif report_type == "all-employees" and period:
            data = service.get_all_employees_report_data(period)
        elif report_type == "all-companies" and period:
            data = service.get_all_companies_report_data(period)
        elif report_type == "cost-breakdown" and period:
            data = service.get_cost_breakdown_report_data(period)
        elif report_type == "summary" and period:
            data = service.get_summary_report_data(period)
        else:
            raise HTTPException(status_code=400, detail="Invalid report parameters")

        # Create ASCII-safe filename for HTTP headers
        raw_name = period or employee_id or company or "report"
        # Replace Japanese year/month markers
        safe_name = raw_name.replace('年', '_').replace('月', '')
        # Replace any remaining non-ASCII characters
        safe_name = ''.join(c if ord(c) < 128 else '_' for c in safe_name)

        if format == "pdf":
            # Generate PDF report (available for summary, monthly, all-companies)
            pdf_bytes = service.generate_pdf_report(report_type, data)
            filename = f"{report_type}_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        elif format == "excel":
            excel_bytes = service.generate_excel_report(report_type, data)
            filename = f"{report_type}_{safe_name}_{datetime.now().strftime('%Y%m%d')}.xlsx"
            return Response(
                content=excel_bytes,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )

        return data
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"Report download error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.get("/history")
async def get_report_history(limit: int = 50, db: sqlite3.Connection = Depends(get_db)):
    """Get history of generated reports"""
    service = ReportService(db)
    return service.get_report_history(limit)
