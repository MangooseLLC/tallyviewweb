'use client';

import { getNonprofitById } from '@/lib/data/nonprofits';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface BoardReport {
  id: string;
  month: string;
  monthLabel: string;
  status: 'Ready' | 'Draft';
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashPosition: number;
  programExpenseRatio: number;
}

export default function ReportsPage() {
  const org = getNonprofitById('org-bright-futures')!;

  const reports: BoardReport[] = org.financials.slice(-6).reverse().map((f, idx) => {
    const date = new Date(f.month + '-01');
    return {
      id: `report-${idx}`,
      month: f.month,
      monthLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      status: idx === 0 ? 'Draft' : 'Ready',
      totalRevenue: f.revenue.total,
      totalExpenses: f.expenses.total,
      netIncome: f.revenue.total - f.expenses.total,
      cashPosition: f.cashPosition,
      programExpenseRatio: Math.round((f.expenses.program / f.expenses.total) * 1000) / 10,
    };
  });

  const currentReport = reports[0];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Board Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monthly board-ready financial reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar className="h-3.5 w-3.5" />
            Custom Range
          </button>
        </div>
      </div>

      {/* Current Month Preview */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{currentReport.monthLabel}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <Clock className="h-3 w-3" /> Draft
                </span>
                <span className="text-xs text-gray-400">Last updated 2 hours ago</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-50 transition-colors">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Total Revenue</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(currentReport.totalRevenue)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Total Expenses</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(currentReport.totalExpenses)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Net Income</p>
            <p className={`text-lg font-bold ${currentReport.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(currentReport.netIncome)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Cash Position</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(currentReport.cashPosition)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Program Expense Ratio</p>
            <p className="text-lg font-bold text-amber-600">{currentReport.programExpenseRatio}%</p>
          </div>
        </div>
      </div>

      {/* Report Archive */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Report Archive</h3>
        <div className="grid grid-cols-3 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg border p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-900">{report.monthLabel}</h4>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  report.status === 'Ready'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  {report.status === 'Ready' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {report.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Revenue</span>
                  <span className="font-medium text-gray-900">{formatCurrency(report.totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Expenses</span>
                  <span className="font-medium text-gray-900">{formatCurrency(report.totalExpenses)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t">
                  <span className="text-gray-500">Net Income</span>
                  <span className={`font-semibold flex items-center gap-1 ${report.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.netIncome >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {formatCurrency(report.netIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Program Ratio</span>
                  <span className="font-medium text-amber-600">{report.programExpenseRatio}%</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                  <Eye className="h-3 w-3" /> View
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                  <Download className="h-3 w-3" /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
