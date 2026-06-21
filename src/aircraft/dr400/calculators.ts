import * as core from "../../domain/core";
import type { MassMomentPoint, Warning } from "../../domain";
import type {
  ClimbInputs,
  ClimbProfilePoint,
  ClimbRateInputs,
  CruiseInputs,
  LandingInputs,
  StallInputs,
  TakeoffInputs,
  WeightBalanceInputs,
} from "../g115b/types";

const FUEL_DENSITY_KG_PER_LITER = 0.72;
const MAIN_FUEL_ARM_M = 1.12;
const WING_FUEL_ARM_M = 0.1;

const envelope: readonly MassMomentPoint[] = [
  { momentKgM: 0.205 * 500, massKg: 500 },
  { momentKgM: 0.205 * 750, massKg: 750 },
  { momentKgM: 0.428 * 1100, massKg: 1100 },
  { momentKgM: 0.564 * 1100, massKg: 1100 },
  { momentKgM: 0.564 * 500, massKg: 500 },
];

const emptyAircraft = [
  { name: "D-EDNE", massKg: 638.46, armM: 0.347, revision: 1, revisionDate: "21.05.2014" },
] as const;

const takeoffDistances = {
  altitudes: [0, 2500, 5000, 8000],
  temperatures: [
    [-5, 15, 35],
    [-10, 10, 30],
    [-15, 5, 25],
    [-21, -1, 19],
  ],
  groundRoll1100: [
    [215, 250, 290],
    [260, 305, 355],
    [330, 385, 445],
    [430, 505, 590],
  ],
  obstacle1100: [
    [445, 515, 600],
    [540, 635, 735],
    [680, 795, 925],
    [890, 1050, 1225],
  ],
  groundRoll900: [
    [120, 140, 165],
    [150, 175, 200],
    [185, 215, 250],
    [245, 285, 335],
  ],
  obstacle900: [
    [250, 290, 340],
    [310, 360, 415],
    [385, 450, 520],
    [505, 590, 695],
  ],
} as const;

const landingDistances = {
  altitudes: [0, 4000, 8000],
  temperatures: [
    [-5, 15, 35],
    [-13, 7, 27],
    [-21, -1, 19],
  ],
  groundRoll1045: [
    [230, 250, 270],
    [260, 280, 300],
    [295, 320, 340],
  ],
  obstacle1045: [
    [500, 530, 560],
    [550, 585, 620],
    [610, 650, 690],
  ],
  groundRoll845: [
    [190, 200, 215],
    [210, 230, 240],
    [240, 260, 275],
  ],
  obstacle845: [
    [425, 450, 475],
    [465, 495, 520],
    [510, 545, 575],
  ],
} as const;

const cruiseRows = [
  { altitudeFt: 0, powerPercent: 75, rpm: 2500, fuelFlowLitersPerHour: 38, tasKmh: 237 },
  { altitudeFt: 0, powerPercent: 65, rpm: 2350, fuelFlowLitersPerHour: 33, tasKmh: 220 },
  { altitudeFt: 2500, powerPercent: 75, rpm: 2550, fuelFlowLitersPerHour: 38, tasKmh: 243 },
  { altitudeFt: 2500, powerPercent: 65, rpm: 2400, fuelFlowLitersPerHour: 33, tasKmh: 225 },
  { altitudeFt: 4500, powerPercent: 75, rpm: 2600, fuelFlowLitersPerHour: 38, tasKmh: 248 },
  { altitudeFt: 4500, powerPercent: 65, rpm: 2450, fuelFlowLitersPerHour: 33, tasKmh: 230 },
  { altitudeFt: 6500, powerPercent: 75, rpm: 2650, fuelFlowLitersPerHour: 38, tasKmh: 254 },
  { altitudeFt: 6500, powerPercent: 65, rpm: 2500, fuelFlowLitersPerHour: 33, tasKmh: 235 },
  { altitudeFt: 8500, powerPercent: 75, rpm: 2700, fuelFlowLitersPerHour: 38, tasKmh: 257 },
  { altitudeFt: 8500, powerPercent: 65, rpm: 2550, fuelFlowLitersPerHour: 33, tasKmh: 240 },
  { altitudeFt: 10500, powerPercent: 65, rpm: 2580, fuelFlowLitersPerHour: 33, tasKmh: 245 },
] as const;

const climbProfile = {
  altitudeFt: [0, 3000, 5500, 8500],
  timeMinutes: [0, 4, 7.5, 16.5],
  fuelLiters: [0, 4.5, 8, 15],
  distanceKm: [0, 9.3, 17.6, 38.8],
} as const;

function interpolateRaggedTable(
  altitudes: readonly number[],
  temperatures: readonly (readonly number[])[],
  values: readonly (readonly number[])[],
  altitudeFt: number,
  oatC: number,
) {
  const perAltitude = altitudes.map((_, index) =>
    core.interpolate1D(temperatures[index], values[index], oatC)
  );
  return core.interpolate1D(altitudes, perAltitude, altitudeFt);
}

function windFactor(windKt: number) {
  if (windKt > 0) {
    return core.interpolate1D([0, 10, 20, 30], [1, 0.85, 0.65, 0.55], Math.min(30, windKt));
  }
  if (windKt < 0) {
    return 1 + Math.abs(windKt) * 0.05;
  }
  return 1;
}

export function calculateTakeoff(inputs: TakeoffInputs) {
  const roll900 = interpolateRaggedTable(takeoffDistances.altitudes, takeoffDistances.temperatures, takeoffDistances.groundRoll900, inputs.pressureAltitudeFt, inputs.oatC);
  const roll1100 = interpolateRaggedTable(takeoffDistances.altitudes, takeoffDistances.temperatures, takeoffDistances.groundRoll1100, inputs.pressureAltitudeFt, inputs.oatC);
  const obstacle900 = interpolateRaggedTable(takeoffDistances.altitudes, takeoffDistances.temperatures, takeoffDistances.obstacle900, inputs.pressureAltitudeFt, inputs.oatC);
  const obstacle1100 = interpolateRaggedTable(takeoffDistances.altitudes, takeoffDistances.temperatures, takeoffDistances.obstacle1100, inputs.pressureAltitudeFt, inputs.oatC);
  const mass = Math.min(1100, Math.max(900, inputs.massKg));
  const groundRollByMassMeters = core.interpolate1D([900, 1100], [roll900, roll1100], mass);
  const takeoffDistanceWithoutMarginMeters = core.interpolate1D([900, 1100], [obstacle900, obstacle1100], mass);
  const factor = windFactor(inputs.windKt);
  const groundRollByWindMeters = groundRollByMassMeters * factor;
  const obstacleByWindMeters = takeoffDistanceWithoutMarginMeters * factor;
  const groundRollMarginMeters = groundRollByWindMeters * (inputs.safetyMarginPercent / 100);
  const warnings: Warning[] = [];
  const atmosphere = core.densityAltitude(inputs.pressureAltitudeFt, inputs.oatC);
  if (inputs.massKg > 1100) warnings.push({ text: "Masse überschreitet MTOW (1100 kg).", danger: true });
  if (inputs.massKg < 900) warnings.push({ text: "Masse unterhalb Tabellenbereich (900-1100 kg).", danger: false });
  if (inputs.pressureAltitudeFt < 0 || inputs.pressureAltitudeFt > 8000) warnings.push({ text: "Druckhöhe ausserhalb Tabellenbereich (SL bis 8000 ft).", danger: false });
  if (inputs.windKt < -5) warnings.push({ text: "Rückenwind überschreitet AFM-Grenzwert.", danger: false });
  if (inputs.slopePercent !== 0) warnings.push({ text: "DR400-Tabellen enthalten keine Neigungskorrektur; Slope wird nicht berücksichtigt.", danger: false });
  return {
    warnings,
    atmosphere,
    groundRollByAtmosphereMeters: roll1100,
    groundRollByMassMeters,
    groundRollBySlopeMeters: groundRollByMassMeters,
    groundRollByWindMeters,
    groundRollMarginMeters,
    groundRollMeters: core.round(groundRollByWindMeters + groundRollMarginMeters),
    takeoffDistanceWithoutMarginMeters: obstacleByWindMeters,
    takeoffDistanceMeters: core.round(obstacleByWindMeters + groundRollMarginMeters),
    rotateSpeedKmh: 100,
    speedAt15mKmh: 130,
    conditions: ["1100/900-kg-Tabelle interpoliert", "Ohne Wind tabelliert", "Klappen Startstellung", "Vollgas", "Trockene Bahn"],
  };
}

export function calculateLanding(inputs: LandingInputs) {
  const roll845 = interpolateRaggedTable(landingDistances.altitudes, landingDistances.temperatures, landingDistances.groundRoll845, inputs.pressureAltitudeFt, inputs.oatC);
  const roll1045 = interpolateRaggedTable(landingDistances.altitudes, landingDistances.temperatures, landingDistances.groundRoll1045, inputs.pressureAltitudeFt, inputs.oatC);
  const obstacle845 = interpolateRaggedTable(landingDistances.altitudes, landingDistances.temperatures, landingDistances.obstacle845, inputs.pressureAltitudeFt, inputs.oatC);
  const obstacle1045 = interpolateRaggedTable(landingDistances.altitudes, landingDistances.temperatures, landingDistances.obstacle1045, inputs.pressureAltitudeFt, inputs.oatC);
  const mass = Math.min(1045, Math.max(845, inputs.massKg));
  const landingRollByMassMeters = core.interpolate1D([845, 1045], [roll845, roll1045], mass);
  const landingDistanceWithoutMarginMeters = core.interpolate1D([845, 1045], [obstacle845, obstacle1045], mass);
  const factor = windFactor(inputs.windKt);
  const landingRollByWindMeters = landingRollByMassMeters * factor;
  const obstacleByWindMeters = landingDistanceWithoutMarginMeters * factor;
  const landingRollMarginMeters = landingRollByWindMeters * (inputs.safetyMarginPercent / 100);
  const warnings: Warning[] = [];
  const atmosphere = core.densityAltitude(inputs.pressureAltitudeFt, inputs.oatC);
  if (inputs.massKg > 1045) warnings.push({ text: "Masse oberhalb DR400-Landetabelle (1045 kg).", danger: true });
  if (inputs.massKg < 845) warnings.push({ text: "Masse unterhalb Tabellenbereich (845-1045 kg).", danger: false });
  if (inputs.pressureAltitudeFt < 0 || inputs.pressureAltitudeFt > 8000) warnings.push({ text: "Druckhöhe ausserhalb Tabellenbereich (SL bis 8000 ft).", danger: false });
  if (inputs.windKt < -5) warnings.push({ text: "Rückenwind überschreitet AFM-Grenzwert.", danger: false });
  return {
    warnings,
    atmosphere,
    landingRollByAtmosphereChartMeters: roll1045,
    landingRollByAtmosphereMeters: roll1045,
    landingRollByMassChartMeters: landingRollByMassMeters,
    landingRollByMassMeters,
    landingRollByWindChartMeters: landingRollByWindMeters,
    landingRollByWindMeters,
    landingRollMarginMeters,
    landingRollMeters: core.round(landingRollByWindMeters + landingRollMarginMeters),
    landingDistanceWithoutMarginMeters: obstacleByWindMeters,
    landingDistanceMeters: core.round(obstacleByWindMeters + landingRollMarginMeters),
    approachSpeedKmh: 125,
    referenceSpeedKmh: 95 * 1.3,
    conditions: ["1045/845-kg-Tabelle interpoliert", "Klappen Landestellung", "Motor Leerlauf", "Trockene ebene Betonbahn"],
  };
}

export function calculateCruise(inputs: CruiseInputs) {
  const power = inputs.powerPercent < 70 ? 65 : 75;
  const rows = cruiseRows.filter((row) => row.powerPercent === power);
  const altitudes = rows.map((row) => row.altitudeFt);
  const rpm = core.interpolate1D(altitudes, rows.map((row) => row.rpm), inputs.densityAltitudeFt);
  const fuelFlowLitersPerHour = core.interpolate1D([65, 75], [33, 38], Math.min(75, Math.max(65, inputs.powerPercent)));
  const tasKmh = core.interpolate1D(altitudes, rows.map((row) => row.tasKmh), inputs.densityAltitudeFt);
  const tasKt = core.kilometersPerHourToKnots(tasKmh);
  return {
    rpm,
    fuelFlowLitersPerHour,
    tasKmh,
    tasKt,
    nauticalMilesPerLiter: tasKt / fuelFlowLitersPerHour,
    powerLabel: `${power}%`,
  };
}

export function calculateClimbRate(inputs: ClimbRateInputs) {
  const baseRate = core.interpolate1D([900, 1100], [1200, 885], Math.min(1100, Math.max(900, inputs.massKg)));
  const climbRateFpm = Math.max(0, baseRate - inputs.densityAltitudeFt * 0.047);
  return {
    warnings: inputs.densityAltitudeFt > 14720 ? [{ text: "Dichtehöhe oberhalb Service Ceiling bei MTOW.", danger: true }] : [],
    climbSpeedKmh: inputs.referencePressureAltitudeFt > 10000 ? 160 : 170,
    climbRateFpm,
    climbRateMs: climbRateFpm * 0.00508,
    conditions: ["Klappen 0°", "Vollgas", "Gemisch best power", "Standardatmosphäre angenähert"],
  };
}

export function calculateClimbProfilePoint(densityAltitudeFt: number): ClimbProfilePoint {
  return {
    chartPixelX: 0,
    timeMinutes: core.interpolate1D(climbProfile.altitudeFt, climbProfile.timeMinutes, densityAltitudeFt),
    fuelLiters: core.interpolate1D(climbProfile.altitudeFt, climbProfile.fuelLiters, densityAltitudeFt),
    distanceKm: core.interpolate1D(climbProfile.altitudeFt, climbProfile.distanceKm, densityAltitudeFt),
  };
}

export function calculateClimb(inputs: ClimbInputs) {
  const departureCumulative = calculateClimbProfilePoint(inputs.departureDensityAltitudeFt);
  const destinationCumulative = calculateClimbProfilePoint(inputs.destinationDensityAltitudeFt);
  const validAltitudeRange = inputs.destinationDensityAltitudeFt > inputs.departureDensityAltitudeFt;
  const climbDistanceKm = validAltitudeRange ? destinationCumulative.distanceKm - departureCumulative.distanceKm : null;
  return {
    error: validAltitudeRange ? null : { text: "Ziel-Dichtehöhe muss größer als Start-Dichtehöhe sein.", danger: true },
    departureCumulative,
    destinationCumulative,
    climbTimeMinutes: validAltitudeRange ? destinationCumulative.timeMinutes - departureCumulative.timeMinutes : null,
    climbFuelLiters: validAltitudeRange ? destinationCumulative.fuelLiters - departureCumulative.fuelLiters : null,
    climbDistanceKm,
    climbDistanceNm: climbDistanceKm == null ? null : climbDistanceKm / core.KMH_PER_KT,
    chartMaximumDensityAltitudeFt: 8500,
    warnings: inputs.destinationDensityAltitudeFt > 8500 ? [{ text: "Ziel-Dichtehöhe oberhalb DR400-Steigflug-Tabelle (8500 ft).", danger: false }] : [],
    conditions: ["Start und Rollverbrauch enthalten", "Klappen eingefahren", "Standardatmosphäre", "Max. Steigrate nach dem Start"],
  };
}

export function calculateStall(inputs: StallInputs) {
  const flaps0 = [105, 113, 148] as const;
  const flapsTakeoff = [99, 106, 140] as const;
  const flapsLanding = [95, 102, 134] as const;
  const speeds = inputs.flapsDegrees === 0 ? flaps0 : inputs.flapsDegrees === 12 ? flapsTakeoff : flapsLanding;
  const stallSpeedKmh = speeds[0];
  return {
    stallSpeedKmh,
    stallSpeedKt: core.kilometersPerHourToKnots(stallSpeedKmh),
    stallLabel: inputs.flapsDegrees === 40 ? "VSO" : "VS1",
    conditions: ["1100 kg", "Motor Leerlauf", "IAS-Angaben", `30° Bank: ${speeds[1]} km/h`, `60° Bank: ${speeds[2]} km/h`],
  };
}

export function isPointInPolygon(point: MassMomentPoint, polygon: readonly MassMomentPoint[]): boolean {
  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects =
      current.massKg > point.massKg !== previous.massKg > point.massKg &&
      point.momentKgM <
        ((previous.momentKgM - current.momentKgM) * (point.massKg - current.massKg)) /
          (previous.massKg - current.massKg) +
          current.momentKgM;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function calculateWeightBalance(inputs: WeightBalanceInputs) {
  const pilotMassKg = Math.max(0, inputs.pilotMassKg);
  const copilotMassKg = Math.max(0, inputs.copilotMassKg);
  const passengerLeftMassKg = Math.max(0, inputs.passengerLeftMassKg ?? 0);
  const passengerRightMassKg = Math.max(0, inputs.passengerRightMassKg ?? 0);
  const baggageMassKg = Math.max(0, inputs.baggageMassKg);
  const mainFuelLiters = Math.max(0, inputs.mainFuelLiters ?? Math.min(109, inputs.fuelLiters));
  const wingFuelLiters = Math.max(0, inputs.wingFuelLiters ?? Math.max(0, inputs.fuelLiters - mainFuelLiters));
  const fuelMassKg = (mainFuelLiters + wingFuelLiters) * FUEL_DENSITY_KG_PER_LITER;
  const empty = emptyAircraft.find((aircraft) => aircraft.name === inputs.aircraftName) ?? emptyAircraft[0];
  const stations = [
    { label: `Leergewicht ${empty.name}`, massKg: empty.massKg, armM: empty.armM },
    { label: "Pilot", massKg: pilotMassKg, armM: 0.41 },
    { label: "Co-Pilot", massKg: copilotMassKg, armM: 0.41 },
    { label: "Passagier links", massKg: passengerLeftMassKg, armM: 1.19 },
    { label: "Passagier rechts", massKg: passengerRightMassKg, armM: 1.19 },
    { label: "Gepäck", massKg: baggageMassKg, armM: 1.9 },
    { label: "Haupttank", massKg: mainFuelLiters * FUEL_DENSITY_KG_PER_LITER, armM: MAIN_FUEL_ARM_M },
    { label: "Flächentanks", massKg: wingFuelLiters * FUEL_DENSITY_KG_PER_LITER, armM: WING_FUEL_ARM_M },
  ].map((station) => ({ ...station, momentKgM: station.massKg * station.armM }));
  const totalMassKg = stations.reduce((sum, station) => sum + station.massKg, 0);
  const totalMomentKgM = stations.reduce((sum, station) => sum + station.momentKgM, 0);
  const cgArmM = totalMomentKgM / totalMassKg;
  const withinEnvelope = isPointInPolygon({ massKg: totalMassKg, momentKgM: totalMomentKgM }, envelope);
  const warnings: Warning[] = [];
  if (totalMassKg > 1100) warnings.push({ text: "Masse überschreitet MTOW (1100 kg).", danger: true });
  if (!withinEnvelope) warnings.push({ text: "Schwerpunkt/Moment liegt außerhalb des Envelope.", danger: true });
  if (mainFuelLiters > 109) warnings.push({ text: "Haupttank überschreitet Kapazität (109 l).", danger: true });
  if (wingFuelLiters > 80) warnings.push({ text: "Flächentanks überschreiten Kapazität (80 l).", danger: true });
  return {
    warnings,
    emptyAircraft: empty,
    fuelMassKg,
    totalMassKg,
    totalMomentKgM,
    cgArmM,
    withinEnvelope,
    stations,
    speeds: {
      rotateSpeedKmh: 100,
      speedAt15mKmh: 130,
      approachSpeedKmh: 125,
      stallIdleFlaps40Kmh: 95,
      stallIdleFlaps40Bank30Kmh: 102,
      stallIdleFlaps40Bank45Kmh: 113,
      referenceSpeedKmh: 95 * 1.3,
    },
    conditions: [
      `Kraftstoff ${FUEL_DENSITY_KG_PER_LITER.toLocaleString("de-DE")} kg/l`,
      "Moment = Masse x Arm",
      "Envelope nach DR400/180 Wägeblatt/SkyDemon-Profil",
    ],
  };
}

export const dr400Data = {
  weightBalance: {
    source: "DR400/180 Wägeblatt D-EDNE / SkyDemon Profil",
    fuelDensityKgPerLiter: FUEL_DENSITY_KG_PER_LITER,
    maximumUsableFuelLiters: 189,
    envelope,
    stations: {
      pilot: { label: "Pilot", armM: 0.41 },
      copilot: { label: "Co-Pilot", armM: 0.41 },
      baggage: { label: "Gepäck", armM: 1.9 },
      fuel: { label: "Kraftstoff", armM: MAIN_FUEL_ARM_M },
    },
    emptyAircraft,
  },
};
