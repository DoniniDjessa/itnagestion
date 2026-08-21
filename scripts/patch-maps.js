const fs = require("fs");

function replaceOnce(file, from, to) {
  let text = fs.readFileSync(file, "utf8");
  if (!text.includes(from)) {
    console.log("MISS", file, from.slice(0, 60));
    return false;
  }
  fs.writeFileSync(file, text.replace(from, to));
  console.log("OK", file);
  return true;
}

// Dashboard: Google map
replaceOnce(
  "d:/DONI/WORK/CLOSE/itnagestion/src/components/dashboard/DashboardView.tsx",
  `import {
  MockGeoMap,
  useMockOrPatientPoints,
} from "@/components/maps/MockGeoMap";`,
  `import {
  GoogleMapMock,
  useMapPointsFromPatients,
} from "@/components/maps/GoogleMapMock";`,
);

replaceOnce(
  "d:/DONI/WORK/CLOSE/itnagestion/src/components/dashboard/DashboardView.tsx",
  "const mockFallbackPoints = useMockOrPatientPoints(patients);",
  "const mockFallbackPoints = useMapPointsFromPatients(patients);",
);

replaceOnce(
  "d:/DONI/WORK/CLOSE/itnagestion/src/components/dashboard/DashboardView.tsx",
  `<MockGeoMap
        points={mapPoints}
        title="Carte géographique"
        subtitle="Mockup — répartition des patients par zone"
        heightClass="h-96"
      />`,
  `<GoogleMapMock
        points={mapPoints}
        title="Carte géographique"
        subtitle="Google Maps mockup — répartition des patients"
        heightClass="h-96"
      />`,
);

// Geographie
replaceOnce(
  "d:/DONI/WORK/CLOSE/itnagestion/src/components/geographie/GeographieView.tsx",
  `import { MockGeoMap, useMockOrPatientPoints } from "@/components/maps/MockGeoMap";`,
  `import { GoogleMapMock, useMapPointsFromPatients } from "@/components/maps/GoogleMapMock";
import { SummaryKpis } from "@/components/ui/SummaryKpis";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { Building2 as BuildingIcon, MapPinned as MapIcon, Home } from "lucide-react";`,
);

replaceOnce(
  "d:/DONI/WORK/CLOSE/itnagestion/src/components/geographie/GeographieView.tsx",
  "const mapPoints = useMockOrPatientPoints(patients);",
  "const mapPoints = useMapPointsFromPatients(patients);",
);

replaceOnce(
  "d:/DONI/WORK/CLOSE/itnagestion/src/components/geographie/GeographieView.tsx",
  `<MockGeoMap
        points={mapPoints}
        title="Carte géographique"
        subtitle="Mockup — zones et volumes"
        heightClass="h-80"
      />`,
  `<GoogleMapMock
        points={mapPoints}
        title="Carte géographique"
        subtitle="Google Maps mockup — zones et volumes"
        heightClass="h-80"
      />`,
);

console.log("done batch");
