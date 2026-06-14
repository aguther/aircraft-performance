import type { WeatherForecast } from "./types";

export type OpenMeteoHourlyResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: Array<number | null>;
    pressure_msl?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
    wind_direction_10m?: Array<number | null>;
    wind_gusts_10m?: Array<number | null>;
  };
};

export function normalizeOpenMeteoForecast(
  response: OpenMeteoHourlyResponse,
  airportId?: string,
  updatedAt = new Date().toISOString(),
): WeatherForecast | null {
  const time = response.hourly?.time?.[0];
  const temperatureC = response.hourly?.temperature_2m?.[0];
  const qnhHpa = response.hourly?.pressure_msl?.[0];
  const windSpeedKt = response.hourly?.wind_speed_10m?.[0];
  const windDirectionTrueDeg = response.hourly?.wind_direction_10m?.[0];
  const windGustKt = response.hourly?.wind_gusts_10m?.[0];
  if (!time || temperatureC == null || qnhHpa == null || windSpeedKt == null || windDirectionTrueDeg == null) return null;

  return {
    id: `icon-d2-${time}Z`,
    airportId,
    validAt: `${time}Z`,
    temperatureC,
    qnhHpa,
    windDirectionTrueDeg,
    windSpeedKt,
    ...(windGustKt == null ? {} : { windGustKt }),
    source: {
      provider: "Open-Meteo",
      model: "ICON-D2",
      updatedAt,
    },
  };
}
