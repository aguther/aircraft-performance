import type { Airport, RunwayDirection } from "../flight-data";

export type RunwayExportOperation = "takeoff" | "landing";

export type RunwayExportDetails = {
  airportLabel: string;
  airportUnavailable: boolean;
  runwayFieldLabel: "Startbahn" | "Landebahn";
  runwayLabel: string;
  runwayUnavailable: boolean;
};

export function runwayExportDetails(
  operation: RunwayExportOperation,
  airport?: Airport,
  runway?: RunwayDirection,
): RunwayExportDetails {
  const distanceLabel = operation === "takeoff" ? "TORA" : "LDA";
  const distanceM = operation === "takeoff" ? runway?.toraM : runway?.ldaM;

  return {
    airportLabel: airport
      ? `${airport.icaoCode ? `${airport.icaoCode} · ` : ""}${airport.name}`
      : "Nicht ausgewählt",
    airportUnavailable: !airport,
    runwayFieldLabel: operation === "takeoff" ? "Startbahn" : "Landebahn",
    runwayLabel: runway
      ? `RWY ${runway.designator} · ${distanceLabel} ${distanceM == null ? "nicht veröffentlicht" : `${distanceM.toLocaleString("de-DE")} m`}`
      : "Nicht ausgewählt",
    runwayUnavailable: !runway,
  };
}
