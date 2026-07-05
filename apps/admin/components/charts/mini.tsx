'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const AXIS = { fontSize: 11, fill: '#94A3B8' } as const;

function Box({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-lg">
      {label != null && <p className="font-semibold text-neutral-900">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-neutral-500">
          {p.name}: <span className="font-medium text-neutral-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function AreaMini({
  data,
  color = '#0A6CFF',
  height = 190,
}: {
  data: { x: string; v: number }[];
  color?: string;
  height?: number;
}) {
  const id = `a-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="x" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} width={40} />
        <Tooltip content={<Box />} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarMini({
  data,
  color = '#0A6CFF',
  height = 190,
}: {
  data: { x: string; v: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <XAxis dataKey="x" tickLine={false} axisLine={false} tick={AXIS} interval={0} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} width={40} />
        <Tooltip cursor={{ fill: '#0A6CFF0D' }} content={<Box />} />
        <Bar dataKey="v" fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutMini({
  data,
  height = 190,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={height}>
        <PieChart>
          <Tooltip content={<Box />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} strokeWidth={0}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-neutral-600">{d.name}</span>
            <span className="font-medium text-neutral-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RadialMini({
  value,
  color = '#0A6CFF',
  label,
  height = 190,
}: {
  value: number;
  color?: string;
  label: string;
  height?: number;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={[{ value, fill: color }]}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={20} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-neutral-900">{value}%</span>
        <span className="text-xs text-neutral-400">{label}</span>
      </div>
    </div>
  );
}
