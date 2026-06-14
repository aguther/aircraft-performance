import { describe, expect, it } from "vitest";
import { aircraftRegistry, defaultAircraft } from "./aircraft";
import { calculatorRegistry } from "./calculators";

describe("aircraft registry", () => {
  it("contains a valid default aircraft", () => {
    expect(aircraftRegistry).toContain(defaultAircraft);
    expect(defaultAircraft.id).toBe("grob-g115b");
    expect(defaultAircraft.registrations).toEqual(["D-EBFT", "D-ELWF", "D-ENZM"]);
  });

  it("provides a calculator for every declared capability", () => {
    const calculatorCapabilities = new Set(
      calculatorRegistry.map((calculator) => calculator.capability),
    );

    for (const capability of defaultAircraft.capabilities) {
      expect(calculatorCapabilities.has(capability)).toBe(true);
    }
  });

  it("uses unique calculator links", () => {
    const links = calculatorRegistry.map((calculator) => calculator.href);
    expect(new Set(links).size).toBe(links.length);
  });

  it("marks Weight & Balance as a React calculator", () => {
    expect(
      calculatorRegistry.find((calculator) => calculator.capability === "weightBalance")
        ?.runtime,
    ).toBe("react");
  });
});
