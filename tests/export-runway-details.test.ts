import { describe, expect, it } from "vitest";
import { runwayExportDetails } from "../src/export/runwayDetails";
import type { Airport, RunwayDirection } from "../src/flight-data";

const runway: RunwayDirection = {
  id: "synthetic-runway-09",
  designator: "09",
  trueHeadingDeg: 90,
  magneticHeadingDeg: 87,
  lengthM: 1350,
  widthM: 24,
  toraM: 1320,
  ldaM: 1180,
  surface: "asphalt",
};

const airport: Airport = {
  id: "synthetic-airport",
  name: "Testflugplatz Nord",
  icaoCode: "EDZZ",
  country: "DE",
  coordinates: { latitude: 50, longitude: 8 },
  elevationFt: 420,
  magneticDeclinationDeg: 3,
  runways: [runway],
  source: { provider: "OpenAIP", updatedAt: "2026-08-18T12:00:00.000Z", retrievedAt: "2026-08-18T14:00:00.000Z" },
};

describe("runway export details", () => {
  it("formats the departure airport, runway, and TORA", () => {
    expect(runwayExportDetails("takeoff", airport, runway)).toEqual({
      airportLabel: "EDZZ · Testflugplatz Nord",
      airportUnavailable: false,
      runwayFieldLabel: "Startbahn",
      runwayLabel: "RWY 09 · TORA 1.320 m",
      runwayUnavailable: false,
    });
  });

  it("formats the arrival airport, runway, and LDA", () => {
    expect(runwayExportDetails("landing", airport, runway)).toEqual({
      airportLabel: "EDZZ · Testflugplatz Nord",
      airportUnavailable: false,
      runwayFieldLabel: "Landebahn",
      runwayLabel: "RWY 09 · LDA 1.180 m",
      runwayUnavailable: false,
    });
  });

  it("marks airport and runway as unavailable for manual calculations", () => {
    expect(runwayExportDetails("takeoff")).toEqual({
      airportLabel: "Nicht ausgewählt",
      airportUnavailable: true,
      runwayFieldLabel: "Startbahn",
      runwayLabel: "Nicht ausgewählt",
      runwayUnavailable: true,
    });
  });
});
