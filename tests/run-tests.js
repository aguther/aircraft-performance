const assert = require("node:assert/strict");

const { createG115BContext } = require("./helpers/load-g115b");

const { calculators, core } = createG115BContext();

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("density altitude uses ISA deviation formula consistently", () => {
  const atmosphere = core.densityAltitude(2000, 25);

  assert.equal(atmosphere.isaTemperatureC.toFixed(2), "11.04");
  assert.equal(atmosphere.isaDeviationC.toFixed(2), "13.96");
  assert.equal(atmosphere.densityAltitudeFt, 3675);
});

test("takeoff calculator returns stable reference result", () => {
  const result = calculators.calculateTakeoff({
    pressureAltitudeFt: 2000,
    oatC: 20,
    massKg: 850,
    slopePercent: 0,
    windKt: 0,
    safetyMarginPercent: 15,
  });

  assert.equal(result.atmosphere.densityAltitudeFt, 3075);
  assert.equal(result.groundRollMeters, 293);
  assert.equal(result.takeoffDistanceMeters, 537);
  assert.equal(result.rotateSpeedKmh.toFixed(1), "91.6");
  assert.equal(result.warnings.length, 0);
});

test("landing calculator returns stable reference result", () => {
  const result = calculators.calculateLanding({
    pressureAltitudeFt: 2000,
    oatC: 20,
    massKg: 850,
    slopePercent: 0,
    windKt: 0,
    safetyMarginPercent: 40,
  });

  assert.equal(result.atmosphere.densityAltitudeFt, 3075);
  assert.equal(result.landingRollMeters, 238);
  assert.equal(result.landingDistanceMeters, 432);
  assert.equal(Math.round(result.approachSpeedKmh), 118);
});

test("cruise calculator returns stable RPM, fuel flow and TAS values", () => {
  const result = calculators.calculateCruise({
    powerPercent: 65,
    densityAltitudeFt: 6000,
  });

  assert.equal(Math.round(result.rpm), 2490);
  assert.equal(result.fuelFlowLitersPerHour, 28.8);
  assert.equal(Math.round(result.tasKmh), 218);
  assert.equal(result.tasKt.toFixed(1), "117.7");
  assert.equal(result.powerLabel, "65%");
});

test("climb rate calculator returns stable VY and ROC values", () => {
  const result = calculators.calculateClimbRate({
    massKg: 920,
    referencePressureAltitudeFt: 4000,
    densityAltitudeFt: 6000,
  });

  assert.equal(result.climbSpeedKmh.toFixed(1), "140.5");
  assert.equal(Math.round(result.climbRateFpm), 820);
  assert.equal(result.warnings.length, 0);
});

test("climb calculator rejects inverted altitude ranges", () => {
  const result = calculators.calculateClimb({
    departureDensityAltitudeFt: 4000,
    destinationDensityAltitudeFt: 3000,
  });

  assert.equal(result.error.text, "Ziel-Dichtehoehe muss groesser als Start-Dichtehoehe sein.");
  assert.equal(result.error.danger, true);
});

test("climb calculator returns stable delta values", () => {
  const result = calculators.calculateClimb({
    departureDensityAltitudeFt: 2000,
    destinationDensityAltitudeFt: 8000,
  });

  assert.equal(result.climbTimeMinutes.toFixed(1), "7.0");
  assert.equal(result.climbFuelLiters.toFixed(1), "5.1");
  assert.equal(result.climbDistanceKm.toFixed(1), "16.7");
  assert.equal(result.climbDistanceNm.toFixed(1), "9.0");
});

test("range calculator returns stable range values", () => {
  const result = calculators.calculateRange({
    powerPercent: 55,
    densityAltitudeFt: 8000,
  });

  assert.equal(Math.round(result.rangeKm), 745);
  assert.equal(Math.round(result.rangeNm), 402);
  assert.equal(result.warnings.length, 0);
});

test("endurance calculator returns stable endurance and reserve values", () => {
  const result = calculators.calculateEndurance({
    fuelLiters: 70,
    powerPercent: 55,
  });

  assert.equal(result.fuelFlowLitersPerHour, 24.2);
  assert.equal(result.reserveFuelLiters.toFixed(2), "18.15");
  assert.equal(result.enduranceHoursTotal.toFixed(2), "2.89");
  assert.equal(result.enduranceHoursWithReserve.toFixed(2), "2.14");
});

test("stall calculator returns stable IAS values", () => {
  const result = calculators.calculateStall({
    massKg: 850,
    powerMode: "leerlauf",
    flapsDegrees: 40,
  });

  assert.equal(result.stallLabel, "VSO");
  assert.equal(result.stallSpeedKmh.toFixed(1), "87.3");
  assert.equal(result.stallSpeedKt.toFixed(1), "47.1");
});

test("weight and balance calculator returns stable loading result", () => {
  const result = calculators.calculateWeightBalance({
    aircraftName: "D-EBFT",
    pilotMassKg: 85,
    copilotMassKg: 0,
    baggageMassKg: 0,
    fuelLiters: 107,
  });

  assert.equal(result.totalMassKg.toFixed(1), "830.6");
  assert.equal(result.totalMomentKgM.toFixed(2), "234.90");
  assert.equal(result.cgArmM.toFixed(4), "0.2828");
  assert.equal(result.withinEnvelope, true);
  assert.equal(result.speeds.rotateSpeedKmh.toFixed(1), "91.2");
  assert.equal(result.speeds.speedAt15mKmh.toFixed(1), "117.6");
  assert.equal(result.speeds.approachSpeedKmh.toFixed(1), "116.8");
  assert.equal(result.speeds.stallIdleFlaps40Kmh.toFixed(1), "86.3");
});

test("weight and balance accepts envelope boundary points", () => {
  const result = calculators.calculateWeightBalance({
    aircraftName: "D-EBFT",
    pilotMassKg: 130,
    copilotMassKg: 80.6753125,
    baggageMassKg: 0,
    fuelLiters: 56.56206597222226,
  });

  assert.equal(result.totalMassKg.toFixed(1), "920.0");
  assert.equal(result.totalMomentKgM.toFixed(2), "234.00");
  assert.equal(result.withinEnvelope, true);
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error.stack);
  }
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}

console.log(`\n${tests.length} test(s) passed.`);
