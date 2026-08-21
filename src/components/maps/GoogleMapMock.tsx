"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Maximize2, X } from "lucide-react";

export type MapPoint = {
  id: string;
  name: string;
  city?: string;
  value: number;
  /** Position on the mock image as % (0–100) */
  x?: number;
  y?: number;
};

/**
 * Relative pin positions on the Côte d'Ivoire mock Google Map image.
 * Tuned for /public/maps/google-map-cote-ivoire.png
 */
const CITY_PINS: Record<string, { x: number; y: number }> = {
  abidjan: { x: 72, y: 78 },
  "grand-bassam": { x: 75, y: 80 },
  "grand bassam": { x: 75, y: 80 },
  bingerville: { x: 74, y: 76 },
  anyama: { x: 71, y: 74 },
  yopougon: { x: 70, y: 77 },
  cocody: { x: 73, y: 77 },
  marcory: { x: 72, y: 79 },
  treichville: { x: 72, y: 80 },
  yamoussoukro: { x: 48, y: 52 },
  bouake: { x: 52, y: 38 },
  "bouaké": { x: 52, y: 38 },
  korhogo: { x: 50, y: 18 },
  "san-pedro": { x: 28, y: 82 },
  "san pedro": { x: 28, y: 82 },
  "san-pédro": { x: 28, y: 82 },
  man: { x: 22, y: 48 },
  daloa: { x: 35, y: 52 },
  gagnoa: { x: 38, y: 62 },
  abengourou: { x: 72, y: 48 },
  bondoukou: { x: 82, y: 35 },
  odienne: { x: 22, y: 22 },
  "odienné": { x: 22, y: 22 },
  seguela: { x: 32, y: 38 },
  "séguéla": { x: 32, y: 38 },
  divo: { x: 48, y: 68 },
  soubre: { x: 32, y: 70 },
  "soubré": { x: 32, y: 70 },
  dabou: { x: 62, y: 76 },
  agboville: { x: 64, y: 68 },
  dimbokro: { x: 55, y: 55 },
  katiola: { x: 52, y: 30 },
  ferkessedougou: { x: 55, y: 15 },
  "ferkessédougou": { x: 55, y: 15 },
  guiglo: { x: 25, y: 58 },
  duekoue: { x: 24, y: 55 },
  "duékoué": { x: 24, y: 55 },
  issia: { x: 36, y: 58 },
  sassandra: { x: 35, y: 85 },
  jacqueville: { x: 65, y: 80 },
};

export const MOCK_GOOGLE_POINTS: MapPoint[] = [
  { id: "1", name: "Plateau", city: "Abidjan", value: 48, x: 72, y: 78 },
  { id: "2", name: "Cocody", city: "Abidjan", value: 36, x: 73, y: 76 },
  { id: "3", name: "Yopougon", city: "Abidjan", value: 41, x: 70, y: 77 },
  { id: "4", name: "Marcory", city: "Abidjan", value: 22, x: 72, y: 79 },
  { id: "5", name: "Centre-ville", city: "Yamoussoukro", value: 28, x: 48, y: 52 },
  { id: "6", name: "Commerce", city: "Bouaké", value: 31, x: 52, y: 38 },
  { id: "7", name: "Centre", city: "Korhogo", value: 18, x: 50, y: 18 },
  { id: "8", name: "Port", city: "San-Pédro", value: 16, x: 28, y: 82 },
  { id: "9", name: "Centre", city: "Man", value: 14, x: 22, y: 48 },
  { id: "10", name: "Centre", city: "Daloa", value: 19, x: 35, y: 52 },
  { id: "11", name: "Centre", city: "Gagnoa", value: 12, x: 38, y: 62 },
  { id: "12", name: "Centre", city: "Abengourou", value: 15, x: 72, y: 48 },
];

function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function pinFor(point: MapPoint, index: number) {
  if (point.x != null && point.y != null) return { x: point.x, y: point.y };
  const key = fold(point.city || point.name);
  if (CITY_PINS[key]) return CITY_PINS[key];
  // also try original with accents stripped already handled
  return {
    x: 30 + ((index * 11) % 50),
    y: 25 + ((index * 13) % 50),
  };
}

type Props = {
  points?: MapPoint[];
  title?: string;
  subtitle?: string;
  heightClass?: string;
  showFullscreenButton?: boolean;
  fullscreen?: boolean;
  onFullscreenChange?: (open: boolean) => void;
};

/**
 * Mockup: Google Maps as a static IMAGE (not iframe / live API).
 * Later replace with the real Google Maps JS SDK.
 */
export function GoogleMapMock({
  points,
  title = "Carte Google",
  subtitle = "Image mockup Google Maps — Côte d'Ivoire",
  heightClass = "h-80",
  showFullscreenButton = true,
  fullscreen: fullscreenControlled,
  onFullscreenChange,
}: Props) {
  const [internalFs, setInternalFs] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const fullscreen =
    fullscreenControlled !== undefined ? fullscreenControlled : internalFs;

  function setFullscreen(open: boolean) {
    onFullscreenChange?.(open);
    if (fullscreenControlled === undefined) setInternalFs(open);
  }

  const data = useMemo(() => {
    // Explicit points (even empty) = real data; omit prop to use demo pins
    if (points !== undefined) return points;
    return MOCK_GOOGLE_POINTS;
  }, [points]);

  const pins = useMemo(
    () =>
      data.map((p, i) => ({
        ...p,
        ...pinFor(p, i),
      })),
    [data],
  );

  const max = pins.reduce((m, p) => Math.max(m, p.value), 1);

  function MapImage({ tall }: { tall?: boolean }) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 ${
          tall ? "h-full min-h-[70vh]" : heightClass
        }`}
      >
        <Image
          src="/maps/google-map-cote-ivoire.png"
          alt="Carte Google Maps — Côte d'Ivoire (mockup)"
          fill
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 900px"
          priority={false}
        />

        <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-md">
          Côte d&apos;Ivoire
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-500 shadow">
          Map data © Google · mockup image
        </div>

        {pins.map((p) => {
          const size = 10 + (p.value / max) * 18;
          const active = focusId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              title={`${p.name}${p.city ? ` · ${p.city}` : ""} — ${p.value}`}
              onClick={() => setFocusId(p.id)}
              className="absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span
                className={`block rounded-full border-2 border-white shadow-lg ${
                  active ? "bg-orange-500 ring-4 ring-orange-300/50" : "bg-red-500"
                }`}
                style={{ width: size, height: size }}
              />
              <span className="mx-auto mt-0.5 block h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-red-500" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <article className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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

        <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
          <MapImage />
          <ul className="max-h-80 space-y-1.5 overflow-y-auto rounded-2xl bg-slate-50 p-2">
            {pins.slice(0, 12).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setFocusId(p.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                    focusId === p.id
                      ? "bg-emerald-500 text-white"
                      : "hover:bg-white"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      focusId === p.id ? "bg-white" : "bg-red-500"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {p.name}
                  </span>
                  <span
                    className={`text-xs ${
                      focusId === p.id ? "text-emerald-50" : "text-slate-400"
                    }`}
                  >
                    {p.value}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </article>

      {fullscreen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950/55 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 bg-emerald-950/90 px-5 py-3 text-white">
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
          <div className="relative flex-1 p-3 sm:p-5">
            <div className="h-full overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
              <MapImage tall />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function useMapPointsFromPatients(
  patients: Array<{
    id: string;
    city?: string | null;
    commune?: string | null;
    quartier?: string | null;
  }>,
): MapPoint[] {
  return useMemo(() => {
    const map = new Map<string, MapPoint>();
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
        const pin = CITY_PINS[fold(city)] ?? CITY_PINS[fold(name)];
        map.set(key, {
          id: key,
          name,
          city: city || undefined,
          value: 1,
          x: pin?.x,
          y: pin?.y,
        });
      }
    }
    const real = Array.from(map.values());
    return real.length > 0 ? real : MOCK_GOOGLE_POINTS;
  }, [patients]);
}
