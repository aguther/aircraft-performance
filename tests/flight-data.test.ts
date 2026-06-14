import { describe, expect, it } from "vitest";
import {
  calculateWindComponents,
  magneticHeading,
  normalizeOpenAipAirport,
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
});
