'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MonthlyFinancials } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

interface RevenueChartProps {
  data: MonthlyFinancials[];
  height?: number;
}

export function RevenueChart({ data, height = 250 }: RevenueChartProps) {
  const chartData = data.slice(-12).map(d => ({
    month: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    revenue: d.revenue.total,
    expenses: d.expenses.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#001F3F" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#001F3F" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, true)} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => formatCurrency(Number(value))}
        />
        <Area type="monotone" dataKey="revenue" stroke="#001F3F" fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
        <Area type="monotone" dataKey="expenses" stroke="#F59E0B" fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
