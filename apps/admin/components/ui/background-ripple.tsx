'use client';

import { useEffect, useMemo, useState } from 'react';

const CELL = 54;

/**
 * Aceternity-style background ripple grid. Adapted to be a non-blocking app
 * background (pointer-events-none) that auto-ripples from random origins, so it
 * never interferes with the dashboard UI.
 */
export function BackgroundRipple() {
  const [dims, setDims] = useState({ cols: 0, rows: 0 });
  const [origin, setOrigin] = useState<{ r: number; c: number } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const update = () =>
      setDims({
        cols: Math.ceil(window.innerWidth / CELL) + 1,
        rows: Math.ceil(window.innerHeight / CELL) + 1,
      });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!dims.cols) return;
    const fire = () => {
      setOrigin({
        r: Math.floor(Math.random() * dims.rows),
        c: Math.floor(Math.random() * dims.cols),
      });
      setTick((t) => t + 1);
    };
    fire();
    const id = setInterval(fire, 2800);
    return () => clearInterval(id);
  }, [dims]);

  useEffect(() => {
    if (!origin) return;
    const t = setTimeout(() => setOrigin(null), 1400);
    return () => clearTimeout(t);
  }, [tick, origin]);

  const cells = useMemo(() => {
    const arr: { r: number; c: number }[] = [];
    for (let r = 0; r < dims.rows; r++)
      for (let c = 0; c < dims.cols; c++) arr.push({ r, c });
    return arr;
  }, [dims]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${dims.cols}, ${CELL}px)`,
        gridAutoRows: `${CELL}px`,
        maskImage: 'radial-gradient(circle at 50% 40%, #000 30%, transparent 85%)',
      }}
    >
      {cells.map(({ r, c }) => {
        const dist = origin ? Math.hypot(r - origin.r, c - origin.c) : 0;
        const active = origin != null && dist < 6.5;
        return (
          <div
            key={`${r}-${c}`}
            style={{
              borderRight: '1px solid rgba(15,23,42,0.035)',
              borderBottom: '1px solid rgba(15,23,42,0.035)',
              backgroundColor: active ? 'rgba(10,108,255,0.10)' : 'transparent',
              transition: 'background-color 420ms ease',
              transitionDelay: `${dist * 45}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
