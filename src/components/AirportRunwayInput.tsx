import { type FormEvent, useEffect, useState } from "react";
import { useFlightPlan } from "../app/FlightPlanContext";
import {
  calculateWindComponents,
  getOpenAipAirport,
  getOpenMeteoWeather,
  searchOpenAipAirports,
  type Airport,
  type RunwayDirection,
  type WeatherForecast,
} from "../flight-data";

export type AirportRunwayValues = {
  elevationFt: number;
  qnhHpa?: number;
  oatC?: number;
  windKt?: number;
};
type WeatherRunwayValues = Omit<AirportRunwayValues, "elevationFt">;

type AirportRunwayOperation = "departure" | "arrival";

function formatDirection(value: number) {
  return Math.round(value).toString().padStart(3, "0");
}

export function utcDateTimeValue(value?: string) {
  return (value ? new Date(value) : new Date()).toISOString().slice(0, 16);
}

export function utcDateTimeIso(value: string) {
  return new Date(`${value}:00Z`).toISOString();
}

function AirportPreviewValue({ label, value, unit, status }: { label: string; value: string | number; unit?: string; status?: "good" | "warn" }) {
  return (
    <div className="airport-preview-item">
      <span className="airport-preview-label">{label}</span>
      <strong className={`airport-preview-value${status ? ` ${status}` : ""}`}>
        {value}{unit ? <span className="airport-preview-unit">{unit}</span> : null}
      </strong>
    </div>
  );
}

function runwayLabel(runway: RunwayDirection) {
  return `RWY ${runway.designator} · ${runway.lengthM} m · ${runway.surface}`;
}

export function weatherValuesForRunway(weather: WeatherForecast, runway: RunwayDirection): WeatherRunwayValues {
  const wind = calculateWindComponents(weather.windDirectionTrueDeg, weather.windSpeedKt, runway.trueHeadingDeg);
  return {
    qnhHpa: Math.round(weather.qnhHpa),
    oatC: Math.round(weather.temperatureC),
    windKt: Math.floor(wind.headwindKt),
  };
}

export function AirportRunwayInput({
  operation,
  enabled,
  onEnabledChange,
  onApply,
}: {
  operation: AirportRunwayOperation;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onApply: (values: AirportRunwayValues) => void;
}) {
  const { flightPlan, updateArrival, updateDeparture } = useFlightPlan();
  const savedSelection = operation === "departure" ? flightPlan.departure : flightPlan.arrival;
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [airport, setAirport] = useState<Airport | null>(null);
  const [runwayId, setRunwayId] = useState(savedSelection?.runwayId ?? "");
  const [plannedAt, setPlannedAt] = useState(utcDateTimeValue(savedSelection?.plannedAt));
  const [loading, setLoading] = useState(Boolean(savedSelection?.airportId));
  const [error, setError] = useState("");
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    if (!savedSelection?.airportId) return;
    const controller = new AbortController();
    getOpenAipAirport(savedSelection.airportId, controller.signal)
      .then((loadedAirport) => {
        setAirport(loadedAirport);
        setResults([loadedAirport]);
        setRunwayId(loadedAirport.runways.some((runway) => runway.id === savedSelection.runwayId)
          ? savedSelection.runwayId
          : loadedAirport.runways[0]?.id ?? "");
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Gespeicherter Flugplatz konnte nicht geladen werden.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [savedSelection?.airportId, savedSelection?.runwayId]);

  const runway = airport?.runways?.find((candidate) => candidate.id === runwayId) ?? airport?.runways?.[0];
  const windComponents = weather && runway
    ? calculateWindComponents(weather.windDirectionTrueDeg, weather.windSpeedKt, runway.trueHeadingDeg)
    : null;
  const appliedValues = airport && runway
    ? {
        elevationFt: airport.elevationFt,
        ...(weather ? { ...weatherValuesForRunway(weather, runway), elevationFt: airport.elevationFt } : {}),
      }
    : null;

  const saveSelection = (selectedAirport: Airport, selectedRunway: RunwayDirection, selectedPlannedAt: string) => {
    const selection = {
      airportId: selectedAirport.id,
      runwayId: selectedRunway.id,
      plannedAt: utcDateTimeIso(selectedPlannedAt),
    };
    if (operation === "departure") updateDeparture(selection);
    else updateArrival(selection);
  };

  useEffect(() => {
    if (!enabled || !airport || !runway || !plannedAt) return;
    if (appliedValues) onApply(appliedValues);
    saveSelection(airport, runway, plannedAt);
  }, [airport?.id, enabled, plannedAt, runway?.id, weather?.id]);

  useEffect(() => {
    if (!airport || !plannedAt) {
      setWeather(null);
      return;
    }
    const controller = new AbortController();
    setWeatherLoading(true);
    setWeatherError("");
    getOpenMeteoWeather(
      airport.coordinates.latitude,
      airport.coordinates.longitude,
      airport.elevationFt,
      utcDateTimeIso(plannedAt),
      airport.id,
      controller.signal,
    )
      .then(setWeather)
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setWeather(null);
        setWeatherError(loadError instanceof Error ? loadError.message : "ICON-D2-Wetterdaten konnten nicht geladen werden.");
      })
      .finally(() => setWeatherLoading(false));
    return () => controller.abort();
  }, [airport?.id, plannedAt]);

  const submitSearch = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await searchOpenAipAirports(search);
      setResults(response.items);
      const selected = response.items[0] ?? null;
      setWeather(null);
      setAirport(selected);
      setRunwayId(selected?.runways[0]?.id ?? "");
      if (!selected) setError("Kein passender Flugplatz gefunden.");
    } catch (searchError) {
      setResults([]);
      setAirport(null);
      setRunwayId("");
      setError(searchError instanceof Error ? searchError.message : "Flugplatzsuche fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const selectAirport = (airportId: string) => {
    const selected = results.find((candidate) => candidate.id === airportId) ?? null;
    setWeather(null);
    setAirport(selected);
    setRunwayId(selected?.runways[0]?.id ?? "");
  };

  const toggleImport = (nextEnabled: boolean) => {
    onEnabledChange(nextEnabled);
    if (nextEnabled && airport && runway && plannedAt) {
      if (appliedValues) onApply(appliedValues);
      saveSelection(airport, runway, plannedAt);
    }
  };

  return (
    <div className="airport-input">
      <form className="airport-search" onSubmit={submitSearch}>
        <label className="airport-field">
          <span>Flugplatzsuche</span>
          <input type="search" value={search} minLength={2} required placeholder="ICAO oder Name" onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Lädt…" : "Suchen"}</button>
      </form>
      {error ? <div className="airport-status error">{error}</div> : null}
      {!airport && !error && !loading ? <div className="airport-status">Bitte Flugplatz über ICAO-Code oder Namen suchen.</div> : null}
      {airport ? (
        <>
          <label className="airport-field">
            <span>Flugplatz</span>
            <select value={airport.id} onChange={(event) => selectAirport(event.target.value)}>
              {results.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.icaoCode ? `${candidate.icaoCode} · ` : ""}{candidate.name}</option>)}
            </select>
          </label>
          <label className="airport-field">
            <span>{operation === "departure" ? "Startbahn" : "Landebahn"}</span>
            <select value={runway?.id ?? ""} disabled={!airport.runways.length} onChange={(event) => setRunwayId(event.target.value)}>
              {airport.runways.map((candidate) => <option value={candidate.id} key={candidate.id}>{runwayLabel(candidate)}</option>)}
            </select>
          </label>
          <label className="airport-field">
            <span>Geplante {operation === "departure" ? "Startzeit" : "Landezeit"} · UTC · 24 h</span>
            <input
              type="datetime-local"
              lang="de-DE"
              value={plannedAt}
              required
              onChange={(event) => {
                setWeather(null);
                setPlannedAt(event.target.value);
              }}
            />
          </label>
          {runway ? (
            <>
              <div className="airport-preview">
                <AirportPreviewValue label="Elevation" value={airport.elevationFt} unit="ft" />
                <AirportPreviewValue label="Deklination" value={`${airport.magneticDeclinationDeg >= 0 ? "+" : ""}${airport.magneticDeclinationDeg.toFixed(1)}`} unit="°" />
                <AirportPreviewValue label="RWY true / mag" value={`${formatDirection(runway.trueHeadingDeg)}° / ${formatDirection(runway.magneticHeadingDeg)}°`} />
                <AirportPreviewValue label="Bahnlänge" value={runway.lengthM} unit="m" />
                <AirportPreviewValue label="Bahnbreite" value={runway.widthM} unit="m" />
              </div>
              {weatherLoading ? <div className="airport-status">ICON-D2-Wetterdaten werden geladen…</div> : null}
              {weatherError ? <div className="airport-status error">{weatherError}</div> : null}
              {weather && windComponents ? (
                <div className="airport-weather">
                  <div className="airport-weather-title">ICON-D2-Prognose · {new Date(weather.validAt).toLocaleString("de-DE", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })} UTC</div>
                  <div className="airport-preview">
                    <AirportPreviewValue label="QNH" value={weather.qnhHpa.toFixed(1)} unit="hPa" />
                    <AirportPreviewValue label="OAT" value={weather.temperatureC.toFixed(1)} unit="°C" />
                    <AirportPreviewValue label="Wind true" value={`${formatDirection(weather.windDirectionTrueDeg)}° / ${weather.windSpeedKt.toFixed(1)}`} unit="kt" />
                    <AirportPreviewValue label="Böen" value={weather.windGustKt?.toFixed(1) ?? "–"} unit={weather.windGustKt == null ? undefined : "kt"} />
                    <AirportPreviewValue
                      label={windComponents.headwindKt >= 0 ? "Gegenwind" : "Rückenwind"}
                      value={Math.abs(windComponents.headwindKt).toFixed(1)}
                      unit="kt"
                      status={windComponents.headwindKt >= 0 ? "good" : "warn"}
                    />
                    <AirportPreviewValue
                      label="Seitenwind"
                      value={Math.abs(windComponents.crosswindKt).toFixed(1)}
                      unit="kt"
                      status={Math.abs(windComponents.crosswindKt) >= 10 ? "warn" : "good"}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : <div className="airport-status error">OpenAIP liefert für diesen Flugplatz keine aktive Bahn.</div>}
          <div className="airport-sources">
            OpenAIP · Stand {new Date(airport.source.updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
            {weather ? <><br /><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · ICON-D2 · Prognose für {new Date(weather.validAt).toLocaleString("de-DE", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })} UTC</> : null}
          </div>
          <label className="import-toggle airport-import-toggle">
            <input type="checkbox" checked={enabled} disabled={!runway || !plannedAt} onChange={(event) => toggleImport(event.target.checked)} />
            <span>{enabled ? "Flugplatz- und Wetterwerte übernommen" : "Flugplatz- und Wetterwerte übernehmen"}</span>
          </label>
        </>
      ) : null}
    </div>
  );
}
