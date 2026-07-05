import { cn } from '@/lib/utils';

// Procedural film-grain noise via inline SVG feTurbulence (no image asset).
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function Noise({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 opacity-[0.045] [mask-image:radial-gradient(#fff,transparent,80%)]',
        className
      )}
      style={{ backgroundImage: `url("${NOISE_SVG}")`, backgroundSize: '120px 120px' }}
    />
  );
}
