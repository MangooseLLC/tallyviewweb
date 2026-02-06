'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

interface ExpenseBreakdownChartProps {
  program: number;
  management: number;
  fundraising: number;
  programRatio: number;
  managementRatio: number;
  fundraisingRatio: number;
  height?: number;
}

const COLORS = ['#001F3F', '#f5ba42', '#3B82F6'];

export function ExpenseBreakdownChart({
  program,
  management,
  fundraising,
  programRatio,
  managementRatio,
  fundraisingRatio,
  height = 220,
}: ExpenseBreakdownChartProps) {
  const data = [
    { name: 'Program Services', value: program, ratio: programRatio },
    { name: 'Management & General', value: management, ratio: managementRatio },
    { name: 'Fundraising', value: fundraising, ratio: fundraisingRatio },
  ];

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={height} height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => formatCurrency(Number(value))}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3 flex-1">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[index] }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{item.name}</p>
              <p className="text-sm font-semibold text-gray-900">{formatPercent(item.ratio)} ({formatCurrency(item.value)})</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
