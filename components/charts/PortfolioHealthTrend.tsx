'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, ComposedChart, Area } from 'recharts';

const trendData = [
  { month: 'Mar 25', avgScore: 76, highRisk: 7 },
  { month: 'Apr 25', avgScore: 77, highRisk: 6 },
  { month: 'May 25', avgScore: 78, highRisk: 6 },
  { month: 'Jun 25', avgScore: 79, highRisk: 5 },
  { month: 'Jul 25', avgScore: 79, highRisk: 5 },
  { month: 'Aug 25', avgScore: 80, highRisk: 5 },
  { month: 'Sep 25', avgScore: 81, highRisk: 5 },
  { month: 'Oct 25', avgScore: 81, highRisk: 4 },
  { month: 'Nov 25', avgScore: 82, highRisk: 4 },
  { month: 'Dec 25', avgScore: 83, highRisk: 4 },
  { month: 'Jan 26', avgScore: 83, highRisk: 4 },
  { month: 'Feb 26', avgScore: 84, highRisk: 4 },
];

interface PortfolioHealthTrendProps {
  height?: number;
}

export function PortfolioHealthTrend({ height = 250 }: PortfolioHealthTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" domain={[70, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <Line yAxisId="left" type="monotone" dataKey="avgScore" stroke="#001F3F" strokeWidth={2} dot={false} name="Avg Compliance Score" />
        <Bar yAxisId="right" dataKey="highRisk" fill="#EF4444" opacity={0.3} barSize={20} name="High Risk Orgs" radius={[4, 4, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
