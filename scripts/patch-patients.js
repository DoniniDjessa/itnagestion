const fs = require("fs");
const p = "d:/DONI/WORK/CLOSE/itnagestion/src/components/patients/PatientsView.tsx";
let text = fs.readFileSync(p, "utf8");

const start = text.indexOf("      {error && (");
const tableStart = text.indexOf('      <div className="data-table">');
if (start < 0 || tableStart < 0) {
  console.log("markers not found", start, tableStart);
  process.exit(1);
}

const neu = `      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SummaryKpis items={kpis} />

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Nom, téléphone, ville, quartier…"
        selects={[
          {
            id: "gender",
            value: genderFilter,
            onChange: setGenderFilter,
            options: [
              { value: "all", label: "Tous les genres" },
              { value: "Femme", label: "Femme" },
              { value: "Homme", label: "Homme" },
              { value: "Autre", label: "Autre" },
            ],
          },
          {
            id: "city",
            value: cityFilter,
            onChange: setCityFilter,
            widthClass: "w-44",
            options: [
              { value: "all", label: "Toutes les villes" },
              ...cityOptions.map((c) => ({ value: c, label: c })),
            ],
          },
        ]}
      />

`;

text = text.slice(0, start) + neu + text.slice(tableStart);
text = text.replace('className="overflow-x-auto"', 'className="data-table-scroll"');
text = text.replace("<MockGeoMap", "<GoogleMapMock");
text = text.replace(
  "Mockup carte — sera remplacée par la vraie carte",
  "Google Maps mockup — cliquez une zone pour centrer",
);
fs.writeFileSync(p, text);
console.log("OK");
