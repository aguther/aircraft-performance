import { useMemo, useState } from "react";
import { useFlightPlan } from "../app/FlightPlanContext";
import {
  calculateWindComponents,
  getMockDeclination,
  getMockWeatherForecasts,
  mockAirports,
  searchMockAirports,
} from "../flight-data";

export type AirportTakeoffValues = {
  elevationFt: number;
  qnhHpa: number;
  oatC: number;
  slopePercent: number;
  windKt: number;
};

function formatDirection(value: number) {
  return `${Math.round(value).toString().padStart(3, "0")}°`;
}

export function AirportTakeoffInput({ onApply }: { onApply: (values: AirportTakeoffValues) => void }) {
  const { flightPlan, updateDeparture } = useFlightPlan();
  const [search, setSearch] = useState("");
  const [airportId, setAirportId] = useState(flightPlan.departure?.airportId ?? mockAirports[0].id);
  const airportResults = useMemo(() => searchMockAirports(search), [search]);
  const airport = mockAirports.find((candidate) => candidate.id === airportId) ?? mockAirports[0];
  const [runwayId, setRunwayId] = useState(flightPlan.departure?.runwayId ?? airport.runways[0].id);
  const forecasts = useMemo(() => getMockWeatherForecasts(airport.id), [airport.id]);
  const [forecastId, setForecastId] = useState(flightPlan.departure?.forecastId ?? forecasts[0].id);
  const runway = airport.runways.find((candidate) => candidate.id === runwayId) ?? airport.runways[0];
  const forecast = forecasts.find((candidate) => candidate.id === forecastId) ?? forecasts[0];
  const declination = getMockDeclination(airport, forecast.validAt);
  const wind = calculateWindComponents(forecast.windDirectionTrueDeg, forecast.windSpeedKt, runway.trueHeadingDeg);

  const selectAirport = (selectedAirportId: string) => {
    const selectedAirport = mockAirports.find((candidate) => candidate.id === selectedAirportId) ?? mockAirports[0];
    const selectedForecasts = getMockWeatherForecasts(selectedAirport.id);
    setAirportId(selectedAirport.id);
    setRunwayId(selectedAirport.runways[0].id);
    setForecastId(selectedForecasts[0].id);
  };
  const updateSearch = (query: string) => {
    setSearch(query);
    const results = searchMockAirports(query);
    if (results.length && !results.some((candidate) => candidate.id === airport.id)) {
      selectAirport(results[0].id);
    }
  };

  const apply = () => {
    onApply({
      elevationFt: airport.elevationFt,
      qnhHpa: forecast.qnhHpa,
      oatC: forecast.temperatureC,
      slopePercent: runway.slopePercent ?? 0,
      windKt: Math.floor(wind.headwindKt),
    });
    updateDeparture({
      airportId: airport.id,
      runwayId: runway.id,
      forecastId: forecast.id,
      plannedAt: forecast.validAt,
    });
  };

  return (
    <div className="airport-input">
      <label className="airport-field">
        <span>Flugplatzsuche</span>
        <input type="search" value={search} placeholder="ICAO oder Name" onChange={(event) => updateSearch(event.target.value)} />
      </label>
      <label className="airport-field">
        <span>Flugplatz</span>
        <select value={airport.id} onChange={(event) => selectAirport(event.target.value)}>
          {airportResults.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.icaoCode} · {candidate.name}</option>)}
        </select>
      </label>
      <label className="airport-field">
        <span>Startbahn</span>
        <select value={runway.id} onChange={(event) => setRunwayId(event.target.value)}>
          {airport.runways.map((candidate) => <option value={candidate.id} key={candidate.id}>RWY {candidate.designator} · {candidate.lengthM} m · {candidate.surface}</option>)}
        </select>
      </label>
      <label className="airport-field">
        <span>Geplante Startzeit / Prognose</span>
        <select value={forecast.id} onChange={(event) => setForecastId(event.target.value)}>
          {forecasts.map((candidate) => <option value={candidate.id} key={candidate.id}>{new Date(candidate.validAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</option>)}
        </select>
      </label>
      <div className="airport-preview">
        <span>Elevation <strong>{airport.elevationFt} ft</strong></span>
        <span>QNH <strong>{forecast.qnhHpa} hPa</strong></span>
        <span>OAT <strong>{forecast.temperatureC} °C</strong></span>
        <span>RWY true / mag <strong>{formatDirection(runway.trueHeadingDeg)} / {formatDirection(runway.magneticHeadingDeg)}</strong></span>
        <span>Slope <strong>{(runway.slopePercent ?? 0).toFixed(1)}%</strong></span>
        <span>Wind true <strong>{formatDirection(forecast.windDirectionTrueDeg)} / {forecast.windSpeedKt} kt</strong></span>
        <span>Komponente <strong>{wind.headwindKt >= 0 ? `${wind.headwindKt.toFixed(1)} kt HW` : `${Math.abs(wind.headwindKt).toFixed(1)} kt TW`}</strong></span>
        <span>Crosswind <strong>{Math.abs(wind.crosswindKt).toFixed(1)} kt</strong></span>
      </div>
      <div className="airport-sources">
        Mock · {airport.source.provider} · {forecast.source.provider} {forecast.source.model} · {declination.source.provider} {declination.source.model} {declination.declinationDeg >= 0 ? "+" : ""}{declination.declinationDeg.toFixed(1)}°
      </div>
      <button className="airport-apply" type="button" onClick={apply}>Werte übernehmen</button>
    </div>
  );
}
