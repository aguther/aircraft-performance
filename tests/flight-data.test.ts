import { describe, expect, it } from "vitest";
import {
  calculateWindComponents,
  magneticHeading,
  normalizeOpenAipAirport,
  normalizeOpenMeteoForecast,
} from "../src/flight-data";
import { openAipAirportFixture } from "./fixtures/openAipAirport";

describe("flight data models and OpenAIP adapter", () => {
  it("normalizes official OpenAIP airport and directional runway fields", () => {
    const airport = normalizeOpenAipAirport(openAipAirportFixture)!;

    expect(airport.name).toBe("Frankfurt-Egelsbach");
    expect(airport.elevationFt).toBe(384);
    expect(airport.source.provider).toBe("OpenAIP");
    expect(airport.runways[0].surface).toBe("asphalt");
    expect(airport.runways[0].toraM).toBe(1400);
    expect(airport.runways[0].magneticHeadingDeg).toBe(78.5);
    expect(airport.runways[0]).not.toHaveProperty("slopePercent");
  });

  it("rejects incomplete OpenAIP airport responses", () => {
    expect(normalizeOpenAipAirport({ name: "Incomplete" })).toBeNull();
  });

  it("calculates magnetic headings and wind components consistently", () => {
    expect(magneticHeading(82, 3.5)).toBe(78.5);
    const components = calculateWindComponents(260, 10, 260);
    expect(components.headwindKt).toBeCloseTo(10);
    expect(components.crosswindKt).toBeCloseTo(0);
  });

  it("normalizes Open-Meteo ICON-D2 forecasts", () => {
    const forecast = normalizeOpenMeteoForecast({
      hourly: {
        time: ["2026-06-14T19:00"],
        temperature_2m: [16.5],
        pressure_msl: [1015.9],
        wind_speed_10m: [5.1],
        wind_direction_10m: [328],
        wind_gusts_10m: [15.4],
      },
    }, "open-aip-edfe", "2026-06-14T18:45:00.000Z")!;

    expect(forecast.validAt).toBe("2026-06-14T19:00Z");
    expect(forecast.qnhHpa).toBe(1015.9);
    expect(forecast.source).toEqual({
      provider: "Open-Meteo",
      model: "ICON-D2",
      updatedAt: "2026-06-14T18:45:00.000Z",
    });
  });
});
