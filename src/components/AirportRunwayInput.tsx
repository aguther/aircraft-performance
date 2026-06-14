import { useMemo, useState } from "react";
import { useFlightPlan } from "../app/FlightPlanContext";
import {
  calculateWindComponents,
  getMockDeclination,
  getMockWeatherForecasts,
  mockAirports,
  searchMockAirports,
} from "../flight-data";

export type AirportRunwayValues = {
  elevationFt: number;
  qnhHpa: number;
  oatC: number;
  slopePercent: number;
  windKt: number;
};

type AirportRunwayOperation = "departure" | "arrival";

export function crosswindTone(crosswindKt: number) {
  return Math.abs(crosswindKt) >= 10 ? "warn" : undefined;
}

function formatDirection(value: number) {
  return Math.round(value).toString().padStart(3, "0");
}

function AirportPreviewValue({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className="airport-preview-item">
      <span className="airport-preview-label">{label}</span>
      <strong className={`airport-preview-value${tone ? ` ${tone}` : ""}`}>
        {value}{unit ? <span className="airport-preview-unit">{unit}</span> : null}
      </strong>
    </div>
  );
}

export function AirportRunwayInput({
  operation,
  onApply,
}: {
  operation: AirportRunwayOperation;
  onApply: (values: AirportRunwayValues) => void;
}) {
  const { flightPlan, updateArrival, updateDeparture } = useFlightPlan();
  const savedSelection = operation === "departure" ? flightPlan.departure : flightPlan.arrival;
  const [search, setSearch] = useState("");
  const [airportId, setAirportId] = useState(savedSelection?.airportId ?? mockAirports[0].id);
  const airportResults = useMemo(() => searchMockAirports(search), [search]);
  const airport = mockAirports.find((candidate) => candidate.id === airportId) ?? mockAirports[0];
  const [runwayId, setRunwayId] = useState(savedSelection?.runwayId ?? airport.runways[0].id);
  const forecasts = useMemo(() => getMockWeatherForecasts(airport.id), [airport.id]);
  const [forecastId, setForecastId] = useState(savedSelection?.forecastId ?? forecasts[0].id);
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
    const selection = {
      airportId: airport.id,
      runwayId: runway.id,
      forecastId: forecast.id,
      plannedAt: forecast.validAt,
    };
    if (operation === "departure") updateDeparture(selection);
    else updateArrival(selection);
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
        <span>{operation === "departure" ? "Startbahn" : "Landebahn"}</span>
        <select value={runway.id} onChange={(event) => setRunwayId(event.target.value)}>
          {airport.runways.map((candidate) => <option value={candidate.id} key={candidate.id}>RWY {candidate.designator} · {candidate.lengthM} m · {candidate.surface}</option>)}
        </select>
      </label>
      <label className="airport-field">
        <span>Geplante {operation === "departure" ? "Startzeit" : "Landezeit"} / Prognose</span>
        <select value={forecast.id} onChange={(event) => setForecastId(event.target.value)}>
          {forecasts.map((candidate) => <option value={candidate.id} key={candidate.id}>{new Date(candidate.validAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</option>)}
        </select>
      </label>
      <div className="airport-preview">
        <AirportPreviewValue label="Elevation" value={airport.elevationFt} unit="ft" />
        <AirportPreviewValue label="QNH" value={forecast.qnhHpa} unit="hPa" />
        <AirportPreviewValue label="OAT" value={forecast.temperatureC} unit="°C" />
        <AirportPreviewValue label="RWY true / mag" value={`${formatDirection(runway.trueHeadingDeg)}° / ${formatDirection(runway.magneticHeadingDeg)}°`} />
        <AirportPreviewValue label="Slope" value={(runway.slopePercent ?? 0).toFixed(1)} unit="%" />
        <AirportPreviewValue label="Wind true" value={`${formatDirection(forecast.windDirectionTrueDeg)}° / ${forecast.windSpeedKt}`} unit="kt" />
        <AirportPreviewValue
          label="Komponente"
          value={Math.abs(wind.headwindKt).toFixed(1)}
          unit={`kt ${wind.headwindKt >= 0 ? "HW" : "TW"}`}
          tone={wind.headwindKt >= 0 ? "good" : "warn"}
        />
        <AirportPreviewValue
          label="Crosswind"
          value={Math.abs(wind.crosswindKt).toFixed(1)}
          unit="kt"
          tone={crosswindTone(wind.crosswindKt)}
        />
      </div>
      <div className="airport-sources">
        Mock · {airport.source.provider} · {forecast.source.provider} {forecast.source.model} · {declination.source.provider} {declination.source.model} {declination.declinationDeg >= 0 ? "+" : ""}{declination.declinationDeg.toFixed(1)}°
      </div>
      <button className="airport-apply" type="button" onClick={apply}>Werte übernehmen</button>
    </div>
  );
}
