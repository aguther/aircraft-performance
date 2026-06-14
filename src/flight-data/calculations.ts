import type { WindComponents } from "./types";

export function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

export function magneticHeading(trueHeadingDeg: number, declinationDeg: number) {
  return normalizeDegrees(trueHeadingDeg - declinationDeg);
}

export function calculateWindComponents(
  windDirectionTrueDeg: number,
  windSpeedKt: number,
  runwayTrueHeadingDeg: number,
): WindComponents {
  const angleRadians = (windDirectionTrueDeg - runwayTrueHeadingDeg) * Math.PI / 180;
  return {
    headwindKt: windSpeedKt * Math.cos(angleRadians),
    crosswindKt: windSpeedKt * Math.sin(angleRadians),
  };
}

export function calculateRunwaySlopePercent(
  thresholdElevationFt: number,
  oppositeThresholdElevationFt: number,
  runwayLengthM: number,
) {
  const elevationDifferenceM = (oppositeThresholdElevationFt - thresholdElevationFt) * 0.3048;
  return elevationDifferenceM / runwayLengthM * 100;
}
