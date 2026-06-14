import type { WeatherForecast } from "./types";

export type AwcMetar = {
  icaoId: string;
  reportTime: string;
  obsTime?: number;
  temp: number | null;
  altim: number | null;
  wdir: number | "VRB" | null;
  wspd: number | null;
  wgst: number | null;
};

export type AwcTafPeriod = {
  timeFrom: string;
  timeTo: string;
  changeIndicator: string | null;
  wdir: number | "VRB" | null;
  wspd: number | null;
  wgst: number | null;
};

export type AwcTaf = {
  icaoId: string;
  issueTime: string;
  validTimeFrom: string;
  validTimeTo: string;
  fcsts: AwcTafPeriod[];
};

const INHG_TO_HPA = 33.8639;
const SKIP_INDICATORS = new Set(["TEMPO", "INTER", "PROB30", "PROB40"]);

function parseAwcTime(value: string): string {
  return new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z").toISOString();
}

export function normalizeAwcMetar(data: AwcMetar[], airportId?: string): WeatherForecast | null {
  const metar = data[0];
  if (!metar) return null;
  const { temp, altim, wdir, wspd, wgst, reportTime, icaoId, obsTime } = metar;
  if (temp == null || altim == null || wdir == null || typeof wdir !== "number" || wspd == null) return null;
  const validAt = parseAwcTime(reportTime);
  return {
    id: `metar-${icaoId.toLowerCase()}-${obsTime ?? new Date(validAt).getTime()}`,
    airportId,
    validAt,
    temperatureC: Math.round(temp * 10) / 10,
    qnhHpa: Math.round(altim * INHG_TO_HPA * 10) / 10,
    windDirectionTrueDeg: wdir,
    windSpeedKt: wspd,
    ...(wgst != null ? { windGustKt: wgst } : {}),
    source: {
      provider: "Aviation Weather Center",
      model: "METAR",
      updatedAt: validAt,
    },
  };
}

export function findTafPeriod(
  data: AwcTaf[],
  plannedAt: string,
): { period: AwcTafPeriod; taf: AwcTaf } | null {
  const taf = data[0];
  if (!taf) return null;
  const target = new Date(plannedAt).getTime();
  if (target < new Date(taf.validTimeFrom).getTime() || target > new Date(taf.validTimeTo).getTime()) return null;
  const basePeriods = taf.fcsts.filter((f) => !SKIP_INDICATORS.has(f.changeIndicator ?? ""));
  const period = [...basePeriods].reverse().find((f) => new Date(f.timeFrom).getTime() <= target);
  if (!period || period.wdir == null || typeof period.wdir !== "number" || period.wspd == null) return null;
  return { period, taf };
}

export function mergeModelWithTaf(
  model: WeatherForecast,
  period: AwcTafPeriod,
  taf: AwcTaf,
): WeatherForecast {
  return {
    ...model,
    id: `taf-${taf.icaoId.toLowerCase()}-${period.timeFrom}`,
    windDirectionTrueDeg: typeof period.wdir === "number" ? period.wdir : model.windDirectionTrueDeg,
    windSpeedKt: period.wspd ?? model.windSpeedKt,
    windGustKt: period.wgst ?? undefined,
    source: {
      provider: "Aviation Weather Center",
      model: `TAF · ${model.source.model}`,
      updatedAt: parseAwcTime(taf.issueTime),
    },
  };
}
