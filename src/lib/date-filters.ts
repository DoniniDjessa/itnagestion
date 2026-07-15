import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";

export type DatePreset =
  | "aujourd_hui"
  | "hier"
  | "avant_hier"
  | "custom_day"
  | "range"
  | "month";

export function getPresetRange(
  preset: DatePreset,
  options?: {
    day?: string;
    from?: string;
    to?: string;
    month?: string; // yyyy-MM
  },
): { from: Date; to: Date } | null {
  const now = new Date();

  switch (preset) {
    case "aujourd_hui":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "hier": {
      const d = subDays(now, 1);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    case "avant_hier": {
      const d = subDays(now, 2);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    case "custom_day": {
      if (!options?.day) return null;
      const d = new Date(options.day);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    case "range": {
      if (!options?.from || !options?.to) return null;
      return {
        from: startOfDay(new Date(options.from)),
        to: endOfDay(new Date(options.to)),
      };
    }
    case "month": {
      if (!options?.month) return null;
      const d = new Date(`${options.month}-01T12:00:00`);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    }
    default:
      return null;
  }
}

export function inDateRange(
  iso: string,
  range: { from: Date; to: Date } | null,
) {
  if (!range) return true;
  const t = new Date(iso).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}

export function currentMonthValue() {
  return format(new Date(), "yyyy-MM");
}

export function todayValue() {
  return format(new Date(), "yyyy-MM-dd");
}
