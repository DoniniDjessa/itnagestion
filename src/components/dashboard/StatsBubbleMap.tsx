"use client";

import { useMemo } from "react";
import { fallbackPoint, geoPointForCity, SENEGAL_OUTLINE } from "@/lib/geo";

export type BubbleDatum = {
  name: string;
  value: number;
  /** Croissance = orange, Diminution = blue, else emerald */
  trend?: "Croissance" | "Diminution" | "Stable";
};

type Props = {
  data: BubbleDatum[];
  title?: string;
  subtitle?: string;
  valueLabel?: string;
};

function radiusFor(value: number, max: number) {
  if (max <= 0 || value <= 0) return 1.2;
  const t = Math.sqrt(value / max);
  return 1.6 + t * 6.5;
}

export function StatsBubbleMap({
  data,
  title = "Répartition géographique",
  subtitle = "Taille = volume · couleur = tendance des cas",
  valueLabel = "Patients",
}: Props) {
  const max = useMemo(
    () => data.reduce((m, d) => Math.max(m, d.value), 0),
    [data],
  );

  const bubbles = useMemo(() => {
    return data.map((d, i) => {
      const point = geoPointForCity(d.name) ?? fallbackPoint(d.name, i);
      return {
        ...d,
        ...point,
        r: radiusFor(d.value, max),
      };
    });
  }, [data, max]);

  const legendSizes = useMemo(() => {
    if (max <= 0) return [1, 3, 8];
    const mid = Math.max(1, Math.round(max / 2));
    return [1, mid, max].filter((v, i, arr) => arr.indexOf(v) === i);
  }, [max]);

  return (
    <article className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-3">
        <svg
          viewBox="0 0 100 100"
          className="mx-auto h-auto w-full max-w-lg drop-shadow-sm"
          role="img"
          aria-label={title}
        >
          <defs>
            <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="1.2"
                stdDeviation="1.4"
                floodColor="#0f172a"
                floodOpacity="0.12"
              />
            </filter>
          </defs>

          <path
            d={SENEGAL_OUTLINE}
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="0.6"
            filter="url(#mapShadow)"
          />

          {/* Soft internal divisions */}
          <path
            d="M30,35 L42,48 L38,62 M48,40 L55,55 L52,70 M62,35 L68,52"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="0.35"
          />

          {bubbles.map((b) => {
            const fill =
              b.trend === "Croissance"
                ? "#f97316"
                : b.trend === "Diminution"
                  ? "#7dd3fc"
                  : "#34d399";
            return (
              <g key={b.name}>
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.r}
                  fill={fill}
                  fillOpacity={0.82}
                  stroke="#fff"
                  strokeWidth={0.35}
                />
                {b.r >= 3.2 && (
                  <text
                    x={b.x}
                    y={b.y + b.r + 2.2}
                    textAnchor="middle"
                    fontSize="2.4"
                    fill="#64748b"
                  >
                    {b.label ?? b.name}
                  </text>
                )}
                <title>
                  {b.name}: {b.value} {valueLabel.toLowerCase()}
                  {b.trend ? ` · ${b.trend}` : ""}
                </title>
              </g>
            );
          })}
        </svg>

        {bubbles.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Aucune donnée géographique — renseignez la ville des patients
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {valueLabel}
          </p>
          <div className="flex items-end gap-3">
            {legendSizes.map((size) => (
              <div key={size} className="flex flex-col items-center gap-1">
                <span
                  className="rounded-full border border-slate-300 bg-white"
                  style={{
                    width: 8 + Math.sqrt(size / Math.max(max, 1)) * 28,
                    height: 8 + Math.sqrt(size / Math.max(max, 1)) * 28,
                  }}
                />
                <span className="text-[10px] text-slate-500">{size}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-orange-500" />
            Croissance
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-sky-300" />
            Diminution
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-400" />
            Stable
          </span>
        </div>
      </div>
    </article>
  );
}
