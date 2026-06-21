import * as dr400 from "../aircraft/dr400/calculators";
import * as g115b from "../aircraft/g115b/calculators";
import { dr400Data } from "../aircraft/dr400/calculators";
import { g115bData } from "../aircraft/g115b/data";
import type { RunwaySurface } from "../flight-data";
import type { AircraftDefinition } from "./aircraft";

export type RunwaySurfaceClass = "hard" | "grass" | "other";

export type SafetyMarginDefaults = {
  fallback: number;
  hard: number;
  grass: number;
  other: number;
};

export function runwaySurfaceClass(surface?: RunwaySurface): RunwaySurfaceClass {
  if (surface === "grass") return "grass";
  if (surface === "asphalt" || surface === "concrete") return "hard";
  return "other";
}

export function safetyMarginForSurface(defaults: SafetyMarginDefaults, surface?: RunwaySurface) {
  return defaults[runwaySurfaceClass(surface)];
}

export function performanceForAircraft(aircraft: AircraftDefinition) {
  if (aircraft.id === "robin-dr400-180") {
    return {
      id: aircraft.id,
      label: aircraft.shortName,
      hasChartOverlays: false,
      supportsSlope: false,
      safetyMargins: {
        takeoff: { fallback: 15, hard: 0, grass: 15, other: 15 },
        landing: { fallback: 15, hard: 0, grass: 15, other: 15 },
      },
      overviewSpeedsKmh: {
        takeoff: 100,
        obstacle: 130,
        approach: 125,
        landingTouchdown: 95,
        climbVy: 170,
        glide: 150,
      },
      limits: {
        takeoffMassMinKg: 900,
        takeoffMassMaxKg: 1100,
        landingMassMinKg: 845,
        landingMassMaxKg: 1045,
        stallMassMinKg: 750,
        stallMassMaxKg: 1100,
        climbRateMassMinKg: 900,
        climbRateMassMaxKg: 1100,
        fuelMaxLiters: 189,
      },
      data: dr400Data,
      calculators: dr400,
    };
  }

  return {
    id: "grob-g115b",
    label: "Grob G115B",
    hasChartOverlays: true,
    supportsSlope: true,
    safetyMargins: {
      takeoff: { fallback: 15, hard: 0, grass: 15, other: 15 },
      landing: { fallback: 40, hard: 0, grass: 40, other: 40 },
    },
    overviewSpeedsKmh: {
      takeoff: 111,
      obstacle: 139,
      approach: 120,
      landingTouchdown: 102,
      climbVy: 157,
      glide: 157,
    },
    limits: {
      takeoffMassMinKg: 750,
      takeoffMassMaxKg: 920,
      landingMassMinKg: 700,
      landingMassMaxKg: 920,
      stallMassMinKg: 750,
      stallMassMaxKg: 920,
      climbRateMassMinKg: 750,
      climbRateMassMaxKg: 920,
      fuelMaxLiters: 107,
    },
    data: g115bData,
    calculators: g115b,
  };
}
