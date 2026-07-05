'use client';

import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import { SANKEY } from '@/lib/data';

// Custom node: colored rounded rect + label placed on the outer side.
function SankeyNode(props: any) {
  const { x, y, width, height, payload } = props;
  const color = payload.color ?? '#0A6CFF';
  const isLeft = payload.depth === 0;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} fill={color} />
      <text
        x={isLeft ? x + width + 8 : x - 8}
        y={y + height / 2}
        textAnchor={isLeft ? 'start' : 'end'}
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={500}
        fill="#334155"
      >
        {payload.name}
      </text>
    </g>
  );
}

// Custom link: horizontal bezier tinted by the source node color.
function SankeyLink(props: any) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    payload,
  } = props;
  const color = payload?.source?.color ?? '#0A6CFF';
  return (
    <path
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.22}
      strokeWidth={Math.max(1, linkWidth)}
    />
  );
}

function SankeyTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const label = p.source && p.target
    ? `${p.source.name} → ${p.target.name}`
    : p.name;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-neutral-900">{label}</p>
      {p.value != null && (
        <p className="text-xs text-neutral-500">{p.value} ta eʼlon</p>
      )}
    </div>
  );
}

export function EvilSankeyChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <Sankey
        data={SANKEY}
        node={<SankeyNode />}
        link={<SankeyLink />}
        nodePadding={26}
        nodeWidth={12}
        margin={{ top: 10, bottom: 10, left: 70, right: 90 }}
      >
        <Tooltip content={<SankeyTooltip />} />
      </Sankey>
    </ResponsiveContainer>
  );
}
