import { calculateRunwaySlopePercent, magneticHeading } from "./calculations";
import type { Airport, MagneticDeclination, RunwayDirection, WeatherForecast } from "./types";

const updatedAt = "2026-06-14T12:00:00.000Z";

function runway(
  id: string,
  designator: string,
  trueHeadingDeg: number,
  declinationDeg: number,
  lengthM: number,
  widthM: number,
  surface: RunwayDirection["surface"],
  thresholdElevationFt: number,
  oppositeThresholdElevationFt: number,
): RunwayDirection {
  return {
    id,
    designator,
    trueHeadingDeg,
    magneticHeadingDeg: magneticHeading(trueHeadingDeg, declinationDeg),
    lengthM,
    widthM,
    toraM: lengthM,
    surface,
    thresholdElevationFt,
    slopePercent: calculateRunwaySlopePercent(thresholdElevationFt, oppositeThresholdElevationFt, lengthM),
  };
}

export const mockAirports: Airport[] = [
  {
    id: "mock-edfe",
    name: "Frankfurt-Egelsbach",
    icaoCode: "EDFE",
    country: "DE",
    coordinates: { latitude: 49.9608, longitude: 8.6436 },
    elevationFt: 384,
    magneticDeclinationDeg: 3.5,
    runways: [
      runway("edfe-08", "08", 82, 3.5, 1400, 25, "asphalt", 381, 387),
      runway("edfe-26", "26", 262, 3.5, 1400, 25, "asphalt", 387, 381),
    ],
    source: { provider: "Mock", updatedAt },
  },
  {
    id: "mock-edfo",
    name: "Michelstadt",
    icaoCode: "EDFO",
    country: "DE",
    coordinates: { latitude: 49.6786, longitude: 8.9733 },
    elevationFt: 1144,
    magneticDeclinationDeg: 3.6,
    runways: [
      runway("edfo-08", "08", 78, 3.6, 604, 15, "grass", 1132, 1156),
      runway("edfo-26", "26", 258, 3.6, 604, 15, "grass", 1156, 1132),
    ],
    source: { provider: "Mock", updatedAt },
  },
  {
    id: "mock-edmo",
    name: "Oberpfaffenhofen",
    icaoCode: "EDMO",
    country: "DE",
    coordinates: { latitude: 48.0814, longitude: 11.2831 },
    elevationFt: 1947,
    magneticDeclinationDeg: 4.2,
    runways: [
      runway("edmo-04", "04", 42, 4.2, 2286, 45, "asphalt", 1942, 1952),
      runway("edmo-22", "22", 222, 4.2, 2286, 45, "asphalt", 1952, 1942),
    ],
    source: { provider: "Mock", updatedAt },
  },
];

const weatherByAirport: Record<string, Omit<WeatherForecast, "id" | "airportId" | "validAt">> = {
  "mock-edfe": { temperatureC: 23, qnhHpa: 1016, windDirectionTrueDeg: 250, windSpeedKt: 9, windGustKt: 15, source: { provider: "Mock", model: "ICON-D2", updatedAt } },
  "mock-edfo": { temperatureC: 21, qnhHpa: 1015, windDirectionTrueDeg: 110, windSpeedKt: 7, windGustKt: 12, source: { provider: "Mock", model: "ICON-D2", updatedAt } },
  "mock-edmo": { temperatureC: 19, qnhHpa: 1014, windDirectionTrueDeg: 40, windSpeedKt: 11, windGustKt: 18, source: { provider: "Mock", model: "ICON-D2", updatedAt } },
};

export function searchMockAirports(query = "") {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return mockAirports;
  return mockAirports.filter((airport) =>
    airport.name.toLowerCase().includes(normalized) ||
    airport.icaoCode?.toLowerCase().includes(normalized));
}

export function getMockWeatherForecasts(airportId: string, referenceDate = new Date()) {
  const base = weatherByAirport[airportId];
  if (!base) return [];
  const start = new Date(referenceDate);
  start.setMinutes(0, 0, 0);
  return Array.from({ length: 17 }, (_, index): WeatherForecast => ({
    ...base,
    id: `${airportId}-${index}`,
    airportId,
    validAt: new Date(start.getTime() + index * 3 * 60 * 60 * 1000).toISOString(),
    temperatureC: base.temperatureC + Math.round(Math.sin(index / 3) * 3),
    windDirectionTrueDeg: (base.windDirectionTrueDeg + index * 4) % 360,
    windSpeedKt: base.windSpeedKt + index % 3,
  }));
}

export function getMockDeclination(airport: Airport, validAt: string): MagneticDeclination {
  return {
    coordinates: airport.coordinates,
    validAt,
    declinationDeg: airport.magneticDeclinationDeg,
    source: { provider: "Mock", model: "NOAA WMM", updatedAt },
  };
}
