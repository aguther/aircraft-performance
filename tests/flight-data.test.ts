import { describe, expect, it } from "vitest";
import {
  calculateRunwaySlopePercent,
  calculateWindComponents,
  getMockDeclination,
  getMockWeatherForecasts,
  magneticHeading,
  mockAirports,
  searchMockAirports,
} from "../src/flight-data";

describe("flight data models and mock providers", () => {
  it("searches airports using OpenAIP-like identifiers", () => {
    expect(searchMockAirports("EDFO")[0].name).toBe("Michelstadt");
    expect(searchMockAirports("oberpfaffenhofen")[0].icaoCode).toBe("EDMO");
  });

  it("provides ICON-D2-like forecasts and NOAA-like declination", () => {
    const airport = mockAirports[0];
    const forecasts = getMockWeatherForecasts(airport.id, new Date("2026-06-14T12:00:00Z"));
    const declination = getMockDeclination(airport, forecasts[0].validAt);

    expect(forecasts).toHaveLength(17);
    expect(airport.source.provider).toBe("OpenAIP");
    expect(airport.source.mock).toBe(true);
    expect(airport.runways[0].toraM).toBe(airport.runways[0].todaM);
    expect(forecasts[0].source.provider).toBe("Open-Meteo");
    expect(forecasts[0].source.model).toBe("ICON-D2");
    expect(declination.source.provider).toBe("NOAA");
    expect(declination.source.model).toBe("WMM");
  });

  it("calculates magnetic headings, slope and wind components consistently", () => {
    expect(magneticHeading(82, 3.5)).toBe(78.5);
    expect(calculateRunwaySlopePercent(100, 110, 1000)).toBeCloseTo(0.3048);
    const components = calculateWindComponents(260, 10, 260);
    expect(components.headwindKt).toBeCloseTo(10);
    expect(components.crosswindKt).toBeCloseTo(0);
  });
});
