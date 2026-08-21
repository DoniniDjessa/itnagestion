const fs = require("fs");

function patch(file, fn) {
  let text = fs.readFileSync(file, "utf8");
  const next = fn(text);
  if (next === text) console.log("NOCHANGE", file);
  else {
    fs.writeFileSync(file, next);
    console.log("PATCHED", file);
  }
}

// Geographie map + KPIs + filter
patch("d:/DONI/WORK/CLOSE/itnagestion/src/components/geographie/GeographieView.tsx", (t) => {
  t = t.replace(/<MockGeoMap[\s\S]*?\/>/, `<GoogleMapMock
        points={mapPoints}
        title="Carte géographique"
        subtitle="Google Maps mockup — zones et volumes"
        heightClass="h-80"
      />`);
  t = t.replace(/overflow-x-auto/g, "data-table-scroll");

  // Replace summary cards section
  t = t.replace(
    /<section className="grid gap-4 sm:grid-cols-3">[\s\S]*?<\/section>/,
    `<SummaryKpis
        columns={3}
        items={[
          {
            label: "Villes",
            value: loading ? "—" : String(villes.length || citySummaries.length),
            icon: MapPinned,
            tone: "emerald",
          },
          {
            label: "Communes",
            value: loading ? "—" : String(communes.length),
            icon: Building2,
            tone: "sky",
          },
          {
            label: "Quartiers",
            value: loading ? "—" : String(quartiers.length),
            icon: Home,
            tone: "violet",
          },
        ]}
      />`,
  );

  // Ensure lucide imports include Home Building2 MapPinned
  if (!t.includes("Home")) {
    t = t.replace(
      `import {
  Building2,
  ChevronRight,
  HeartPulse,
  MapPinned,
  Search,
  Users,
  X,
} from "lucide-react";`,
      `import {
  Building2,
  ChevronRight,
  HeartPulse,
  Home,
  MapPinned,
  Search,
  Users,
  X,
} from "lucide-react";`,
    );
  }

  // Replace search box with FilterToolbar
  t = t.replace(
    /<div className="relative max-w-md">[\s\S]*?<\/div>\n\n      <div className="data-table">/,
    `<FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={\`Rechercher \${tab}…\`}
      />

      <div className="data-table">`,
  );

  // Remove unused SummaryCard function if SummaryKpis used - keep for MiniKpi
  // Clean duplicate imports from previous patch
  t = t.replace(
    /import \{ SummaryKpis \} from "@\/components\/ui\/SummaryKpis";\nimport \{ FilterToolbar \} from "@\/components\/ui\/FilterToolbar";\nimport \{ Building2 as BuildingIcon, MapPinned as MapIcon, Home \} from "lucide-react";\n/,
    `import { SummaryKpis } from "@/components/ui/SummaryKpis";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
`,
  );

  return t;
});

// Commandes: add search + KPIs
patch("d:/DONI/WORK/CLOSE/itnagestion/src/components/commandes/CommandesView.tsx", (t) => {
  if (!t.includes("SummaryKpis")) {
    t = t.replace(
      `import { Pagination } from "@/components/ui/Pagination";`,
      `import { Pagination } from "@/components/ui/Pagination";
import { SummaryKpis } from "@/components/ui/SummaryKpis";
import { FilterToolbar, DatePresetChips } from "@/components/ui/FilterToolbar";
import {
  currentMonthValue,
  getPresetRange,
  inDateRange,
  todayValue,
  type DatePreset,
} from "@/lib/date-filters";
import {
  Banknote,
  ClipboardList,
  Clock3,
  ShoppingBag,
} from "lucide-react";`,
    );
  }

  // Add state after filter state
  if (!t.includes("const [search, setSearch]")) {
    t = t.replace(
      `const [filter, setFilter] =
    useState<(typeof statusFilters)[number]>("Toutes");`,
      `const [filter, setFilter] =
    useState<(typeof statusFilters)[number]>("Toutes");
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState<DatePreset | "all">("all");
  const [day, setDay] = useState(todayValue());
  const [fromDate, setFromDate] = useState(todayValue());
  const [toDate, setToDate] = useState(todayValue());
  const [month, setMonth] = useState(currentMonthValue());`,
    );
  }

  // Replace filtered useMemo
  t = t.replace(
    /const filtered = useMemo\(\(\) => \{\n    if \(filter === "Toutes"\) return commandes;\n    return commandes\.filter\(\(c\) => c\.status === filter\);\n  \}, \[commandes, filter\]\);/,
    `const range = useMemo(
    () =>
      preset === "all"
        ? null
        : getPresetRange(preset, {
            day,
            from: fromDate,
            to: toDate,
            month,
          }),
    [preset, day, fromDate, toDate, month],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commandes.filter((c) => {
      if (filter !== "Toutes" && c.status !== filter) return false;
      if (!inDateRange(c.created_at, range)) return false;
      if (!q) return true;
      const patientName = c.patients
        ? \`\${c.patients.first_name} \${c.patients.last_name}\`.toLowerCase()
        : "";
      return (
        c.reference_id.toLowerCase().includes(q) ||
        patientName.includes(q) ||
        (c.disease_to_treat || "").toLowerCase().includes(q)
      );
    });
  }, [commandes, filter, search, range]);

  const orderKpis = useMemo(() => {
    const pending = filtered.filter((c) => c.status === "En attente").length;
    const paid = filtered.filter((c) => c.status === "Payée").length;
    const total = filtered.reduce((s, c) => s + Number(c.total_amount || 0), 0);
    return [
      { label: "Commandes", value: String(filtered.length), icon: ClipboardList, tone: "blue" as const, hint: "Selon filtres" },
      { label: "En attente", value: String(pending), icon: Clock3, tone: "amber" as const },
      { label: "Payées", value: String(paid), icon: ShoppingBag, tone: "emerald" as const },
      { label: "Montant", value: formatCurrency(total), icon: Banknote, tone: "violet" as const },
    ];
  }, [filtered]);`,
  );

  // Insert KPIs and filter toolbar after error block
  if (!t.includes("<SummaryKpis items={orderKpis}")) {
    t = t.replace(
      `{error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200`,
      `{error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SummaryKpis items={orderKpis} />

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Référence, patient, maladie…"
      >
        <DatePresetChips
          value={preset}
          onChange={(v) => setPreset(v as DatePreset | "all")}
          options={[
            { id: "all", label: "Toutes" },
            { id: "aujourd_hui", label: "Aujourd'hui" },
            { id: "hier", label: "Hier" },
            { id: "month", label: "Mois" },
          ]}
        />
        {preset === "month" && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="field h-10 w-40 py-0"
          />
        )}
      </FilterToolbar>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200`,
    );
  }

  t = t.replace(/overflow-x-auto/g, (m, offset, s) => {
    // only inside data-table
    const before = s.slice(Math.max(0, offset - 80), offset);
    if (before.includes("data-table") || before.includes("</div>\n        {!loading")) {
      return "data-table-scroll";
    }
    return m;
  });
  // simpler: replace the table scroll specifically
  t = t.replace(
    `{!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">`,
    `{!loading && filtered.length > 0 && (
          <div className="data-table-scroll">`,
  );
  t = t.replace(
    `{!loading && filtered.length > 0 && (
          <div className="data-table-scroll">`,
    `{!loading && filtered.length > 0 && (
          <div className="data-table-scroll">`,
  );

  return t;
});

console.log("batch2 done");
