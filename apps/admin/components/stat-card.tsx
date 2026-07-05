import { Card } from '@heroui/react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Noise } from '@/components/ui/noise';
import type { Stat } from '@/lib/data';

export function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-none">
      {/* Aceternity-style tinted gradient + noise */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 120% at 100% 0%, ${stat.tint}1F 0%, ${stat.tint}0A 30%, transparent 60%)`,
        }}
      />
      <Noise />

      <Card.Content className="relative p-5">
        <div className="flex items-start justify-between">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: stat.tint + '1A' }}
          >
            <Icon size={22} style={{ color: stat.tint }} />
          </div>
          <div
            className={`flex items-center gap-0.5 text-sm font-medium ${
              stat.up ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {stat.up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {stat.delta}
          </div>
        </div>

        <p className="mt-4 flex items-baseline gap-1 text-2xl font-bold text-neutral-900">
          <NumberTicker value={stat.value} decimalPlaces={stat.decimals ?? 0} />
          {stat.suffix ? (
            <span className="text-lg font-semibold text-neutral-700">{stat.suffix}</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm text-neutral-500">{stat.label}</p>
      </Card.Content>
    </Card>
  );
}
