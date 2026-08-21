"use client";

import { useMemo, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { fallbackPoint, geoPointForCity, SENEGAL_OUTLINE } from "@/lib/geo";

export type MockMapPoint = {
  id: string;
  name: string;
  city?: string;
  value: number;
  trend?: "Croissance" | "Diminution" | "Stable";
};

/** Demo points when real patient geo is empty */
export const MOCK_MAP_POINTS: MockMapPoint[] = [
  { id: "1", name: "Plateau", city: "Dakar", value: 42, trend: "Croissance" },
  { id: "2", name: "Médina", city: "Dakar", value: 28, trend: "Stable" },
  { id: "3", name: "Parcelles", city: "Dakar", value: 35, trend: "Croissance" },
  { id: "4", name: "Thiaroye", city: "Pikine", value: 19, trend: "Diminution" },
  { id: "5", name: "Guédiawaye", city: "Guédiawaye", value: 22, trend: "Stable" },
  { id: "6", name: "Rufisque", city: "Rufisque", value: 14, trend: "Croissance" },
  { id: "7", name: "Thiès centre", city: "Thiès", value: 31, trend: "Stable" },
  { id: "8", name: "Mbour", city: "Mbour", value: 17, trend: "Diminution" },
  { id: "9", name: "Saint-Louis", city: "Saint-Louis", value: 12, trend: "Stable" },
  { id: "10", name: "Kaolack", city: "Kaolack", value: 16, trend: "Croissance" },
  { id: "11", name: "Touba", city: "Touba", value: 24, trend: "Croissance" },
  { id: "12", name: "Ziguinchor", city: "Ziguinchor", value: 11, trend: "Diminution" },
];

type Props = {
  points?: MockMapPoint[];
  title?: string;
  subtitle?: string;
  heightClass?: string;
  showFullscreenButton?: boolean;
  compact?: boolean;
  /** Controlled fullscreen */
  fullscreen?: boolean;
  onFullscreenChange?: (open: boolean) => void;
};

function radiusFor(value: number, max: number) {
  if (max <= 0 || value <= 0) return 1.4;
  return 1.8 + Math.sqrt(value / max) * 7;
}

function MapSvg({
  points,
  interactive,
}: {
  points: MockMapPoint[];
  interactive?: boolean;
}) {
  const max = points.reduce((m, p) => Math.max(m, p.value), 0);
  const bubbles = points.map((p, i) => {
    const loc = p.city || p.name;
    const point = geoPointForCity(loc) ?? fallbackPoint(loc, i);
    return { ...p, ...point, r: radiusFor(p.value, max) };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      className="mx-auto h-full w-full drop-shadow-sm"
      role="img"
      aria-label="Carte mockup"
    >
      <defs>
        <linearGradient id="mapFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="100%" stopColor="#f0fdf4" />
        </linearGradient>
        <filter id="mockShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="1.2"
            floodColor="#065f46"
            floodOpacity="0.12"
          />
        </filter>
      </defs>
      <path
        d={SENEGAL_OUTLINE}
        fill="url(#mapFill)"
        stroke="#6ee7b7"
        strokeWidth="0.7"
        filter="url(#mockShadow)"
      />
      <path
        d="M28,38 L40,50 L36,64 M46,42 L54,56 L50,72 M60,36 L68,54"
        fill="none"
        stroke="#a7f3d0"
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
          <g key={b.id}>
            <circle
              cx={b.x}
              cy={b.y}
              r={b.r}
              fill={fill}
              fillOpacity={0.85}
              stroke="#fff"
              strokeWidth={0.4}
              className={interactive ? "cursor-pointer" : undefined}
            >
              <title>
                {b.name}
                {b.city ? ` · ${b.city}` : ""} — {b.value} cas
              </title>
            </circle>
            {b.r >= 3.5 && (
              <text
                x={b.x}
                y={b.y + b.r + 2.4}
                textAnchor="middle"
                fontSize="2.2"
                fill="#64748b"
              >
                {b.name.length > 10 ? `${b.name.slice(0, 9)}…` : b.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function MockGeoMap({
  points,
  title = "Carte géographique",
  subtitle = "Mockup — données de démonstration",
  heightClass = "h-72",
  showFullscreenButton = true,
  compact = false,
  fullscreen: fullscreenControlled,
  onFullscreenChange,
}: Props) {
  const [internalFs, setInternalFs] = useState(false);
  const fullscreen =
    fullscreenControlled !== undefined ? fullscreenControlled : internalFs;

  function setFullscreen(open: boolean) {
    onFullscreenChange?.(open);
    if (fullscreenControlled === undefined) setInternalFs(open);
  }

  const data = useMemo(
    () => (points && points.length > 0 ? points : MOCK_MAP_POINTS),
    [points],
  );

  return (
    <>
      <article
        className={`rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${
          compact ? "" : ""
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
          {showFullscreenButton && (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <Maximize2 strokeWidth={1.75} className="h-3.5 w-3.5" />
              Plein écran
            </button>
          )}
        </div>
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 p-3 ${heightClass}`}
        >
          <MapSvg points={data} interactive />
          <p className="absolute bottom-2 right-3 text-[9px] text-slate-300">
            Carte mockup · vraie carte bientôt
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> Croissance
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-300" /> Diminution
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Stable
          </span>
        </div>
      </article>

      {fullscreen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950/50 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 bg-emerald-950/80 px-5 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-emerald-100/70">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
              aria-label="Fermer"
            >
              <X strokeWidth={1.75} className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
            <div className="h-full max-h-[85vh] w-full max-w-5xl rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
              <MapSvg points={data} interactive />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function useMockOrPatientPoints(
  patients: Array<{
    id: string;
    city?: string | null;
    commune?: string | null;
    quartier?: string | null;
  }>,
): MockMapPoint[] {
  return useMemo(() => {
    const map = new Map<string, MockMapPoint>();
    for (const p of patients) {
      const city = (p.city || "").trim();
      const quartier = (p.quartier || "").trim();
      const commune = (p.commune || "").trim();
      const name = quartier || commune || city;
      if (!name) continue;
      const key = `${city}|${commune}|${quartier}`.toLowerCase();
      const prev = map.get(key);
      if (prev) prev.value += 1;
      else {
        map.set(key, {
          id: key,
          name,
          city: city || undefined,
          value: 1,
          trend: "Stable",
        });
      }
    }
    const real = Array.from(map.values());
    return real.length > 0 ? real : MOCK_MAP_POINTS;
  }, [patients]);
}
