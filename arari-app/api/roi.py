"""
ROIAgent - Return on Investment Analysis
Calculates ROI and profitability metrics by client
"""

import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional


class ROIService:
    """Service for ROI calculations"""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()

    def calculate_client_roi(self, company: str = None,
                             period: str = None) -> List[Dict[str, Any]]:
        """Calculate ROI by client (派遣先)"""

        sql = """
            SELECT
                e.dispatch_company as company,
                COUNT(DISTINCT p.employee_id) as employee_count,
                SUM(p.billing_amount) as total_revenue,
                SUM(p.total_company_cost) as total_cost,
                SUM(p.gross_profit) as total_profit,
                AVG(p.profit_margin) as avg_margin,
                SUM(p.work_hours) as total_hours,
                AVG(e.billing_rate) as avg_billing_rate,
                AVG(e.hourly_rate) as avg_hourly_rate
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE 1=1
        """
        params = []

        if company:
            sql += " AND e.dispatch_company = ?"
            params.append(company)

        if period:
            sql += " AND p.period = ?"
            params.append(period)

        sql += " GROUP BY e.dispatch_company ORDER BY total_profit DESC"

        self.cursor.execute(sql, params)

        results = []
        for row in self.cursor.fetchall():
            (company_name, emp_count, revenue, cost, profit,
             margin, hours, billing_rate, hourly_rate) = row

            # Calculate ROI
            roi = (profit / cost * 100) if cost and cost > 0 else 0

            # Calculate profit per hour
            profit_per_hour = profit / hours if hours and hours > 0 else 0

            # Calculate profit per employee
            profit_per_employee = profit / emp_count if emp_count and emp_count > 0 else 0

            # Calculate efficiency (actual margin vs target 15%)
            efficiency = (margin / 15 * 100) if margin else 0

            results.append({
                "company": company_name,
                "employee_count": emp_count,
                "total_revenue": revenue or 0,
                "total_cost": cost or 0,
                "total_profit": profit or 0,
                "avg_margin": margin or 0,
                "total_hours": hours or 0,
                "avg_billing_rate": billing_rate or 0,
                "avg_hourly_rate": hourly_rate or 0,
                "roi": roi,
                "profit_per_hour": profit_per_hour,
                "profit_per_employee": profit_per_employee,
                "efficiency_pct": min(efficiency, 200),  # Cap at 200%
                "status": self._get_status(margin)
            })

        return results

    def calculate_employee_roi(self, employee_id: str = None,
                               period: str = None) -> List[Dict[str, Any]]:
        """Calculate ROI by employee"""

        sql = """
            SELECT
                p.employee_id,
                e.name,
                e.dispatch_company,
                e.billing_rate,
                e.hourly_rate,
                p.billing_amount as revenue,
                p.total_company_cost as cost,
                p.gross_profit as profit,
                p.profit_margin as margin,
                p.work_hours,
                p.overtime_hours,
                p.period
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE 1=1
        """
        params = []

        if employee_id:
            sql += " AND p.employee_id = ?"
            params.append(employee_id)

        if period:
            sql += " AND p.period = ?"
            params.append(period)

        sql += " ORDER BY p.gross_profit DESC"

        self.cursor.execute(sql, params)

        results = []
        for row in self.cursor.fetchall():
            (emp_id, name, company, billing_rate, hourly_rate,
             revenue, cost, profit, margin, work_hours, overtime, period_val) = row

            # Calculate ROI
            roi = (profit / cost * 100) if cost and cost > 0 else 0

            # Calculate profit per hour
            total_hours = (work_hours or 0) + (overtime or 0)
            profit_per_hour = profit / total_hours if total_hours > 0 else 0

            # Rate efficiency
            rate_efficiency = ((billing_rate - hourly_rate) / billing_rate * 100) if billing_rate else 0

            results.append({
                "employee_id": emp_id,
                "name": name,
                "company": company,
                "period": period_val,
                "billing_rate": billing_rate or 0,
                "hourly_rate": hourly_rate or 0,
                "revenue": revenue or 0,
                "cost": cost or 0,
                "profit": profit or 0,
                "margin": margin or 0,
                "work_hours": work_hours or 0,
                "overtime_hours": overtime or 0,
                "roi": roi,
                "profit_per_hour": profit_per_hour,
                "rate_efficiency": rate_efficiency,
                "status": self._get_status(margin)
            })

        return results

    def get_roi_summary(self, period: str = None) -> Dict[str, Any]:
        """Get overall ROI summary"""

        sql = """
            SELECT
                SUM(billing_amount) as total_revenue,
                SUM(total_company_cost) as total_cost,
                SUM(gross_profit) as total_profit,
                AVG(profit_margin) as avg_margin,
                COUNT(DISTINCT employee_id) as employee_count,
                SUM(work_hours) as total_hours
            FROM payroll_records
        """
        params = []

        if period:
            sql += " WHERE period = ?"
            params.append(period)

        self.cursor.execute(sql, params)
        row = self.cursor.fetchone()

        if not row or row[0] is None:
            return {
                "period": period,
                "total_revenue": 0,
                "total_cost": 0,
                "total_profit": 0,
                "avg_margin": 0,
                "overall_roi": 0,
                "profit_per_hour": 0,
                "profit_per_employee": 0,
                "status": "no_data"
            }

        revenue, cost, profit, margin, emp_count, hours = row

        # Calculate metrics
        overall_roi = (profit / cost * 100) if cost and cost > 0 else 0
        profit_per_hour = profit / hours if hours and hours > 0 else 0
        profit_per_employee = profit / emp_count if emp_count and emp_count > 0 else 0

        # Get company breakdown
        client_roi = self.calculate_client_roi(period=period)

        # Calculate distribution
        profitable_clients = sum(1 for c in client_roi if c["margin"] >= 15)
        underperforming_clients = sum(1 for c in client_roi if c["margin"] < 15)

        return {
            "period": period,
            "total_revenue": revenue or 0,
            "total_cost": cost or 0,
            "total_profit": profit or 0,
            "avg_margin": margin or 0,
            "overall_roi": overall_roi,
            "profit_per_hour": profit_per_hour,
            "profit_per_employee": profit_per_employee,
            "employee_count": emp_count or 0,
            "total_hours": hours or 0,
            "client_count": len(client_roi),
            "profitable_clients": profitable_clients,
            "underperforming_clients": underperforming_clients,
            "status": self._get_status(margin),
            "target_margin": 15.0
        }

    def get_roi_trend(self, months: int = 6) -> List[Dict[str, Any]]:
        """Get ROI trend over time"""

        self.cursor.execute("""
            SELECT
                period,
                SUM(billing_amount) as revenue,
                SUM(total_company_cost) as cost,
                SUM(gross_profit) as profit,
                AVG(profit_margin) as margin,
                COUNT(DISTINCT employee_id) as emp_count
            FROM payroll_records
            GROUP BY period
            ORDER BY period DESC
            LIMIT ?
        """, (months,))

        results = []
        for row in self.cursor.fetchall():
            period, revenue, cost, profit, margin, emp_count = row

            roi = (profit / cost * 100) if cost and cost > 0 else 0

            results.append({
                "period": period,
                "revenue": revenue or 0,
                "cost": cost or 0,
                "profit": profit or 0,
                "margin": margin or 0,
                "roi": roi,
                "employee_count": emp_count or 0
            })

        # Reverse to chronological order
        return list(reversed(results))

    def get_recommendations(self, period: str = None) -> List[Dict[str, Any]]:
        """Generate ROI improvement recommendations"""
        recommendations = []

        # Get client ROI
        clients = self.calculate_client_roi(period=period)

        for client in clients:
            if client["margin"] < 10:
                # Critical - suggest rate increase
                current_rate = client["avg_billing_rate"]
                target_rate = self._calculate_target_rate(
                    client["avg_hourly_rate"], 15
                )
                increase_needed = target_rate - current_rate

                recommendations.append({
                    "priority": "high",
                    "type": "rate_increase",
                    "client": client["company"],
                    "current_margin": client["margin"],
                    "target_margin": 15,
                    "current_rate": current_rate,
                    "suggested_rate": target_rate,
                    "increase_needed": increase_needed,
                    "message": f"{client['company']}: 単価を ¥{current_rate:,.0f} → ¥{target_rate:,.0f} (+¥{increase_needed:,.0f}) に引き上げを推奨"
                })

            elif client["margin"] < 15:
                # Warning - suggest review
                recommendations.append({
                    "priority": "medium",
                    "type": "review",
                    "client": client["company"],
                    "current_margin": client["margin"],
                    "target_margin": 15,
                    "message": f"{client['company']}: マージン {client['margin']:.1f}% - コスト見直しまたは単価交渉を検討"
                })

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 99))

        return recommendations

    def _calculate_target_rate(self, hourly_rate: float, target_margin: float) -> float:
        """Calculate billing rate needed to achieve target margin"""
        if not hourly_rate:
            return 0

        # Simplified: billing_rate = hourly_rate / (1 - target_margin/100)
        # This doesn't account for insurance costs, but gives rough estimate
        insurance_factor = 1.15  # ~15% added costs

        total_cost_per_hour = hourly_rate * insurance_factor
        target_rate = total_cost_per_hour / (1 - target_margin / 100)

        return round(target_rate, 0)

    def _get_status(self, margin: float) -> str:
        """Get status based on margin"""
        if margin is None:
            return "no_data"
        elif margin >= 18:
            return "excellent"
        elif margin >= 15:
            return "on_target"
        elif margin >= 10:
            return "below_target"
        else:
            return "critical"

    def compare_periods(self, period1: str, period2: str) -> Dict[str, Any]:
        """Compare ROI between two periods"""

        summary1 = self.get_roi_summary(period1)
        summary2 = self.get_roi_summary(period2)

        # Calculate changes
        def calc_change(v1, v2):
            if v2 == 0:
                return None
            return ((v1 - v2) / abs(v2)) * 100 if v2 else 0

        return {
            "period1": period1,
            "period2": period2,
            "period1_data": summary1,
            "period2_data": summary2,
            "changes": {
                "revenue": calc_change(summary1["total_revenue"], summary2["total_revenue"]),
                "cost": calc_change(summary1["total_cost"], summary2["total_cost"]),
                "profit": calc_change(summary1["total_profit"], summary2["total_profit"]),
                "margin": summary1["avg_margin"] - summary2["avg_margin"],
                "roi": summary1["overall_roi"] - summary2["overall_roi"],
                "employees": summary1["employee_count"] - summary2["employee_count"]
            },
            "improved": summary1["total_profit"] > summary2["total_profit"]
        }
