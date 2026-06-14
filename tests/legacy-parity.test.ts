import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import * as domainCalculators from "../src/aircraft/g115b/calculators";

type Calculator = (inputs: unknown) => unknown;

function loadLegacyCalculators(): Record<string, Calculator> {
  const context = vm.createContext({
    window: {},
    console,
    Math,
    Number,
    Object,
    Array,
    String,
    Boolean,
    JSON,
  });

  (context.window as { window?: unknown }).window = context.window;

  for (const relativePath of [
    "js/g115b-core.js",
    "js/performance-data.js",
    "js/g115b-calculators.js",
  ]) {
    const source = fs.readFileSync(path.resolve(relativePath), "utf8");
    vm.runInContext(source, context, { filename: relativePath });
  }

  return (
    context.window as {
      G115B: { calculators: Record<string, Calculator> };
    }
  ).G115B.calculators;
}

function normalize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe("legacy calculator parity", () => {
  const legacyCalculators = loadLegacyCalculators();
  const cases: Array<{
    name: keyof typeof domainCalculators;
    inputs: unknown;
  }> = [
    {
      name: "calculateTakeoff",
      inputs: {
        pressureAltitudeFt: 2500,
        oatC: 22,
        massKg: 845,
        slopePercent: -0.7,
        windKt: 8,
        safetyMarginPercent: 15,
      },
    },
    {
      name: "calculateLanding",
      inputs: {
        pressureAltitudeFt: 1800,
        oatC: 18,
        massKg: 810,
        windKt: -3,
        safetyMarginPercent: 25,
      },
    },
    {
      name: "calculateCruise",
      inputs: { powerPercent: 65, densityAltitudeFt: 6500 },
    },
    {
      name: "calculateClimbRate",
      inputs: {
        massKg: 860,
        referencePressureAltitudeFt: 4500,
        densityAltitudeFt: 6200,
      },
    },
    {
      name: "calculateClimb",
      inputs: {
        departureDensityAltitudeFt: 1500,
        destinationDensityAltitudeFt: 9500,
      },
    },
    {
      name: "calculateStall",
      inputs: { massKg: 875, powerMode: "leerlauf", flapsDegrees: 40 },
    },
    {
      name: "calculateWeightBalance",
      inputs: {
        aircraftName: "D-ELWF",
        pilotMassKg: 82,
        copilotMassKg: 76,
        baggageMassKg: 8,
        fuelLiters: 74,
      },
    },
  ];

  for (const testCase of cases) {
    it(`matches legacy output for ${testCase.name}`, () => {
      const domainCalculator = domainCalculators[testCase.name] as Calculator;
      const legacyCalculator = legacyCalculators[testCase.name];

      expect(normalize(domainCalculator(testCase.inputs))).toEqual(
        normalize(legacyCalculator(testCase.inputs)),
      );
    });
  }
});

