
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileSpreadsheet, Building2, User, Calendar, Filter } from 'lucide-react';

interface Employee {
    employee_id: string;
    name: string;
    dispatch_company: string;
    department?: string;
}

interface PayrollRecord {
    period: string;
    work_days: number;
    work_hours: number;
    overtime_hours: number;
    base_salary: number;
    overtime_pay: number;
    gross_salary: number;
    net_salary: number;
    // Add other fields as needed for display
}

export default function WageLedgerPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportType, setExportType] = useState<'format_b' | 'format_c'>('format_b');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    useEffect(() => {
        fetchData();
    }, [params.id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Employee
            const empRes = await fetch(`${API_URL}/api/employees/${params.id}`);
            if (!empRes.ok) throw new Error("Failed to fetch employee");
            const empData = await empRes.json();
            setEmployee(empData);

            // Fetch Payrolls
            const payrollRes = await fetch(`${API_URL}/api/payroll?employee_id=${params.id}`);
            if (!payrollRes.ok) throw new Error("Failed to fetch payrolls");
            const payrollData = await payrollRes.json();

            // Sort chronologically
            setPayrolls(payrollData);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const currentYearPayrolls = payrolls.filter(p => p.period.includes(year.toString()));

    // Sort by month (Jan -> Dec)
    // Assuming period format "2025年4月"
    const sortedPayrolls = [...currentYearPayrolls].sort((a, b) => {
        const getMonth = (s: string) => parseInt(s.split('年')[1].replace('月', ''));
        return getMonth(a.period) - getMonth(b.period);
    });

    const handleExport = async (target: 'single' | 'all_in_company') => {
        try {
            setExporting(true);

            const payload = {
                template_name: exportType,
                year: year,
                target: target,
                employee_id: params.id,
                company_name: employee?.dispatch_company
            };

            const response = await fetch(`${API_URL}/api/export/wage-ledger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                alert(`Export failed: ${err.detail}`);
                throw new Error(err.detail);
            }

            // Handle file download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Content-Disposition usually handles filename, but fallback:
            a.download = target === 'all_in_company'
                ? `賃金台帳_${employee?.dispatch_company}_${year}.zip`
                : `賃金台帳_${employee?.name}_${year}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (err) {
            console.error(err);
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading Wage Ledger...</div>;
    if (!employee) return <div className="p-10 text-center text-red-400">Employee not found</div>;

    return (
        <div className="min-h-screen bg-[#111111] text-gray-200 font-sans">
            {/* HEADER */}
            <div className="bg-[#1a1a1a] border-b border-gray-800 p-6 sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full transition">
                            <ArrowLeft className="w-6 h-6 text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                賃金台帳 (Wage Ledger)
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                <span className="flex items-center gap-1"><User size={14} /> {employee.name} ({employee.employee_id})</span>
                                <span className="flex items-center gap-1"><Building2 size={14} /> {employee.dispatch_company}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-700">
                            <button
                                onClick={() => setYear(year - 1)}
                                className="px-3 py-1 text-sm hover:text-white text-gray-500 transition"
                            >
                                {year - 1}
                            </button>
                            <div className="px-4 py-1 text-sm font-bold text-blue-400 border-x border-gray-700">
                                <Calendar size={14} className="inline mr-2 -mt-1" />
                                {year}年度
                            </div>
                            <button
                                onClick={() => setYear(year + 1)}
                                className="px-3 py-1 text-sm hover:text-white text-gray-500 transition"
                            >
                                {year + 1}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <FileSpreadsheet className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">出力オプション</h3>
                            <p className="text-xs text-gray-500">テンプレートを選択</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
                            <button
                                onClick={() => setExportType('format_b')}
                                className={`px-4 py-2 text-sm rounded-md transition ${exportType === 'format_b' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Format B
                            </button>
                            <button
                                onClick={() => setExportType('format_c')}
                                className={`px-4 py-2 text-sm rounded-md transition ${exportType === 'format_c' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Format C
                            </button>
                        </div>

                        <div className="h-8 w-px bg-gray-700 mx-2"></div>

                        <button
                            onClick={() => handleExport('single')}
                            disabled={exporting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition disabled:opacity-50"
                        >
                            <Download size={18} />
                            {exporting ? '処理中...' : '個人 (Excel)'}
                        </button>

                        <button
                            onClick={() => handleExport('all_in_company')}
                            disabled={exporting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg shadow-lg shadow-blue-900/20 transition disabled:opacity-50"
                        >
                            <Building2 size={18} />
                            {exporting ? '圧縮中...' : '工場一括 (ZIP)'}
                        </button>
                    </div>
                </div>

                {/* DATA GRID */}
                <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-900 text-gray-400 font-medium">
                                <tr>
                                    <th className="px-6 py-4 sticky left-0 bg-gray-900">項目 / 月度</th>
                                    {sortedPayrolls.map(p => (
                                        <th key={p.period} className="px-6 py-4 min-w-[120px] text-center">{p.period}</th>
                                    ))}
                                    {/* Fill empty months if needed */}
                                    {Array.from({ length: 12 - sortedPayrolls.length }).map((_, i) => (
                                        <th key={i} className="px-6 py-4 min-w-[120px] text-center text-gray-700">-</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {/* Attendance Section */}
                                <tr className="bg-gray-800/50"><td colSpan={100} className="px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">勤怠 (Attendance)</td></tr>

                                <tr className="hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-3 font-medium text-gray-300 sticky left-0 bg-[#1a1a1a]">出勤日数</td>
                                    {sortedPayrolls.map(p => <td key={p.period} className="px-6 py-3 text-center">{p.work_days}</td>)}
                                </tr>
                                <tr className="hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-3 font-medium text-gray-300 sticky left-0 bg-[#1a1a1a]">労働時間</td>
                                    {sortedPayrolls.map(p => <td key={p.period} className="px-6 py-3 text-center">{p.work_hours}H</td>)}
                                </tr>
                                <tr className="hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-3 font-medium text-gray-300 sticky left-0 bg-[#1a1a1a]">残業時間</td>
                                    {sortedPayrolls.map(p => <td key={p.period} className="px-6 py-3 text-center text-yellow-500">{p.overtime_hours}H</td>)}
                                </tr>

                                {/* Payment Section */}
                                <tr className="bg-gray-800/50"><td colSpan={100} className="px-6 py-2 text-xs font-bold text-blue-500 uppercase tracking-wider">支給 (Earnings)</td></tr>

                                <tr className="hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-3 font-medium text-gray-300 sticky left-0 bg-[#1a1a1a]">基本給</td>
                                    {sortedPayrolls.map(p => <td key={p.period} className="px-6 py-3 text-center">¥{p.base_salary.toLocaleString()}</td>)}
                                </tr>
                                <tr className="hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-3 font-medium text-gray-300 sticky left-0 bg-[#1a1a1a]">残業手当</td>
                                    {sortedPayrolls.map(p => <td key={p.period} className="px-6 py-3 text-center">¥{p.overtime_pay.toLocaleString()}</td>)}
                                </tr>
                                <tr className="hover:bg-gray-800/50 transition bg-blue-900/10">
                                    <td className="px-6 py-3 font-bold text-blue-300 sticky left-0 bg-[#1a1a1a] border-l-4 border-blue-500">総支給額</td>
                                    {sortedPayrolls.map(p => <td key={p.period} className="px-6 py-3 text-center font-bold text-blue-300">¥{p.gross_salary.toLocaleString()}</td>)}
                                </tr>

                                {/* Net Section */}
                                <tr className="bg-gray-800/50"><td colSpan={100} className="px-6 py-2 text-xs font-bold text-green-500 uppercase tracking-wider">合計 (Summary)</td></tr>
                                <tr className="hover:bg-gray-800/50 transition bg-green-900/10">
                                    <td className="px-6 py-3 font-bold text-green-300 sticky left-0 bg-[#1a1a1a] border-l-4 border-green-500">差引支給額</td>
                                    {sortedPayrolls.map(p => <td key={p.period} className="px-6 py-3 text-center font-bold text-green-300">¥{p.net_salary.toLocaleString()}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {!currentYearPayrolls.length && (
                        <div className="p-12 text-center text-gray-500">
                            <p className="text-lg">No records found for {year}</p>
                            <p className="text-sm">Try selecting a different year</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
