'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COMPOSED } from '@/lib/data';

const ACCENT = '#0A6CFF';
const GREEN = '#16A34A';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-neutral-900">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-neutral-500">
            {p.dataKey === 'elonlar' ? 'Eʼlonlar' : 'Daromad'}:
          </span>
          <span className="font-medium text-neutral-900">
            {p.value}
            {p.dataKey === 'daromad' ? 'M soʻm' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export function EvilComposedChart() {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={COMPOSED} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.95} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.35} />
          </linearGradient>
          <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={ACCENT} fillOpacity={0.12} />
            <line x1="0" y1="0" x2="0" y2="6" stroke={ACCENT} strokeWidth="2" strokeOpacity={0.35} />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#EEF1F4" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} width={44} />
        <Tooltip cursor={{ fill: '#0A6CFF0D' }} content={<ChartTooltip />} />
        <Bar dataKey="elonlar" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={26} />
        <Line
          type="monotone"
          dataKey="daromad"
          stroke={GREEN}
          strokeWidth={3}
          dot={{ r: 4, fill: '#fff', stroke: GREEN, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: GREEN, stroke: '#fff', strokeWidth: 2 }}
          yAxisId={0}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
