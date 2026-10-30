'use client';

import { useEffect, useRef, useState } from 'react';
import type { GroupBar } from '@/src/lib/chart-utils';

export interface RinkPoint {
  confidence: number;
  points: number;
  title: string; // e.g. "Oct 12 vs Lakeside"
  detail: string; // e.g. "Confidence 9, 3 points"
}

// Each puck is one game: further right = more confident, higher = more points.
// Blue lines sit at the insight cut-offs (5 and under / 6-7 / 8+).
export default function RinkChart({ points, zones }: { points: RinkPoint[]; zones: GroupBar[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number; title: string; detail: string } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(280, width);
  const mobile = W < 560;
  const H = mobile ? 290 : 350;
  const L = 30, R = 2, T = 6, B = 66;
  const iw = W - L - R, ih = H - T - B;
  const X = (c: number) => L + ((c - 0.5) / 10) * iw;
  const Y = (p: number) => T + ih * 0.93 - (p / 4) * ih * 0.86;
  const x5 = L + 0.5 * iw, x7 = L + 0.7 * iw, xc = L + 0.6 * iw;
  const corner = Math.min(14, ih / 6) * 2.4;
  const pr = mobile ? 7 : 9;
  const labelXs = [(L + x5) / 2, (x5 + x7) / 2, (x7 + L + iw) / 2];
  const seen: Record<string, number> = {};

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block w-full h-auto overflow-visible"
          role="img"
          aria-label="Rink chart: each puck is a game, placed by confidence and points scored"
        >
          <defs>
            <clipPath id="rink-clip"><rect x={L} y={T} width={iw} height={ih} rx={corner} /></clipPath>
          </defs>
          <rect x={L} y={T} width={iw} height={ih} rx={corner} className="fill-white stroke-gray-900" strokeWidth={3} />
          <g clipPath="url(#rink-clip)">
            <rect x={x7} y={T} width={L + iw - x7} height={ih} className="fill-blue-600" opacity={0.1} />
            <rect x={x5 - 5} y={T} width={10} height={ih} className="fill-blue-600" />
            <rect x={x7 - 5} y={T} width={10} height={ih} className="fill-blue-600" />
            <line x1={xc} x2={xc} y1={T} y2={T + ih} className="stroke-red-600" strokeWidth={4} />
            <circle cx={xc} cy={T + ih / 2} r={Math.min(34, ih / 5)} className="fill-none stroke-red-600" strokeWidth={2} opacity={0.7} />
            {[0.015, 0.985].map((f) => (
              <line key={f} x1={L + iw * f} x2={L + iw * f} y1={T} y2={T + ih} className="stroke-red-600" strokeWidth={2} opacity={0.55} />
            ))}
          </g>
          {[0, 1, 2, 3, 4].map((p) => (
            <text key={p} x={L - 8} y={Y(p) + 4} textAnchor="end" className="fill-gray-500 text-[13px]">{p}</text>
          ))}
          {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
            <text key={c} x={X(c)} y={T + ih + 20} textAnchor="middle" className="fill-gray-500 text-[13px]">{c}</text>
          ))}
          {points.map((g, i) => {
            const key = `${g.confidence}:${g.points}`;
            const n = (seen[key] = (seen[key] || 0) + 1);
            const side = (n - 1) % 2 ? 1 : -1;
            const dx = side * Math.ceil((n - 1) / 2) * pr * 1.9;
            return (
              <g key={i} className="puck" style={{ ['--i' as string]: i }}>
                <circle
                  cx={X(g.confidence) + dx}
                  cy={Y(g.points)}
                  r={pr}
                  tabIndex={0}
                  aria-label={`${g.title}: ${g.detail}`}
                  className="fill-gray-900 stroke-white outline-none focus-visible:stroke-blue-600"
                  strokeWidth={2}
                  onMouseEnter={() => setHover({ x: X(g.confidence) + dx, y: Y(g.points) - pr, title: g.title, detail: g.detail })}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover({ x: X(g.confidence) + dx, y: Y(g.points) - pr, title: g.title, detail: g.detail })}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}
          {zones.map((z, i) => (
            <g key={z.name}>
              <text x={labelXs[i]} y={T + ih + 44} textAnchor="middle" className="fill-gray-900 text-[18px] font-bold font-serif">{z.name}</text>
              <text x={labelXs[i]} y={T + ih + 61} textAnchor="middle" className="fill-gray-500 text-[13px]">
                {z.avgPoints.toFixed(1)} {mobile ? 'pts' : 'pts a game'}
              </text>
            </g>
          ))}
        </svg>
      )}
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-lg"
          style={{ left: hover.x, top: hover.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-serif text-base font-bold text-gray-900">{hover.title}</p>
          <p className="text-[15px] text-gray-600">{hover.detail}</p>
        </div>
      )}
    </div>
  );
}
