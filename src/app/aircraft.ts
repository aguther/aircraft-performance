export type AircraftCapability =
  | "weightBalance"
  | "takeoff"
  | "climb"
  | "cruise"
  | "landing"
  | "stall"
  | "climbRate";

export type AircraftDefinition = {
  id: string;
  manufacturer: string;
  model: string;
  shortName: string;
  registrations: string[];
  capabilities: AircraftCapability[];
};

export const aircraftRegistry: AircraftDefinition[] = [
  {
    id: "grob-g115b",
    manufacturer: "Grob",
    model: "G115B",
    shortName: "Grob 115B",
    registrations: ["D-EBFT", "D-ELWF", "D-ENZM"],
    capabilities: [
      "weightBalance",
      "takeoff",
      "climb",
      "cruise",
      "landing",
      "stall",
      "climbRate",
    ],
  },
];

export const defaultAircraft = aircraftRegistry[0];

