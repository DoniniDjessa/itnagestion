/**
 * Relative positions (0–100) for a stylized Senegal bubble map.
 * Used when city names match (case-insensitive, accents normalized).
 */
export type GeoPoint = {
  x: number;
  y: number;
  label?: string;
};

const CITY_POINTS: Record<string, GeoPoint> = {
  dakar: { x: 18, y: 62, label: "Dakar" },
  pikine: { x: 22, y: 58 },
  guediawaye: { x: 20, y: 55 },
  "guédiawaye": { x: 20, y: 55 },
  rufisque: { x: 28, y: 64 },
  bargny: { x: 30, y: 66 },
  thies: { x: 38, y: 55 },
  "thiès": { x: 38, y: 55 },
  mbour: { x: 36, y: 72 },
  "joal-fadiouth": { x: 40, y: 78 },
  "saint-louis": { x: 32, y: 18 },
  "saint louis": { x: 32, y: 18 },
  louga: { x: 40, y: 32 },
  kaolack: { x: 48, y: 62 },
  fatick: { x: 44, y: 68 },
  diourbel: { x: 46, y: 52 },
  touba: { x: 50, y: 48 },
  matam: { x: 72, y: 28 },
  tambacounda: { x: 72, y: 58 },
  kolda: { x: 58, y: 82 },
  ziguinchor: { x: 42, y: 90 },
  sedhiou: { x: 50, y: 88 },
  "sédhiou": { x: 50, y: 88 },
  kedougou: { x: 88, y: 72 },
  "kédougou": { x: 88, y: 72 },
  bakel: { x: 86, y: 42 },
  "richard-toll": { x: 28, y: 22 },
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function geoPointForCity(city: string): GeoPoint | null {
  const key = fold(city);
  if (CITY_POINTS[key]) return CITY_POINTS[key];
  // fuzzy: startswith known key
  for (const [k, point] of Object.entries(CITY_POINTS)) {
    if (key.includes(k) || k.includes(key)) return point;
  }
  return null;
}

/** Deterministic fallback position for unknown cities (spread in center band). */
export function fallbackPoint(city: string, index: number): GeoPoint {
  const hash = Array.from(fold(city)).reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    x: 35 + ((hash * 7 + index * 11) % 40),
    y: 35 + ((hash * 13 + index * 5) % 40),
  };
}

/** Stylized Senegal outline path (viewBox 0 0 100 100). */
export const SENEGAL_OUTLINE =
  "M12,48 C10,40 14,28 22,20 C30,12 42,10 52,14 C64,18 78,22 86,32 C92,40 94,52 90,62 C86,74 78,82 68,88 C56,94 44,96 34,92 C24,88 14,78 12,66 C10,58 12,52 12,48 Z";
