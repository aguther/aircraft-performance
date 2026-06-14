import { type FormEvent, useEffect, useState } from "react";
import { useFlightPlan } from "../app/FlightPlanContext";
import { getOpenAipAirport, searchOpenAipAirports, type Airport, type RunwayDirection } from "../flight-data";

export type AirportRunwayValues = {
  elevationFt: number;
  slopePercent: number;
};

type AirportRunwayOperation = "departure" | "arrival";

function formatDirection(value: number) {
  return Math.round(value).toString().padStart(3, "0");
}

function dateTimeLocalValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function AirportPreviewValue({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="airport-preview-item">
      <span className="airport-preview-label">{label}</span>
      <strong className="airport-preview-value">
        {value}{unit ? <span className="airport-preview-unit">{unit}</span> : null}
      </strong>
    </div>
  );
}

function runwayLabel(runway: RunwayDirection) {
  return `RWY ${runway.designator} · ${runway.lengthM} m · ${runway.surface}`;
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
  const [results, setResults] = useState<Airport[]>([]);
  const [airport, setAirport] = useState<Airport | null>(null);
  const [runwayId, setRunwayId] = useState(savedSelection?.runwayId ?? "");
  const [plannedAt, setPlannedAt] = useState(dateTimeLocalValue(savedSelection?.plannedAt));
  const [loading, setLoading] = useState(Boolean(savedSelection?.airportId));
  const [error, setError] = useState("");

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

  const submitSearch = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await searchOpenAipAirports(search);
      setResults(response.items);
      const selected = response.items[0] ?? null;
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
    setAirport(selected);
    setRunwayId(selected?.runways[0]?.id ?? "");
  };

  const apply = () => {
    if (!airport || !runway) return;
    onApply({
      elevationFt: airport.elevationFt,
      slopePercent: runway.slopePercent ?? 0,
    });
    const selection = {
      airportId: airport.id,
      runwayId: runway.id,
      plannedAt: new Date(plannedAt).toISOString(),
    };
    if (operation === "departure") updateDeparture(selection);
    else updateArrival(selection);
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
            <span>Geplante {operation === "departure" ? "Startzeit" : "Landezeit"}</span>
            <input type="datetime-local" value={plannedAt} required onChange={(event) => setPlannedAt(event.target.value)} />
          </label>
          {runway ? (
            <div className="airport-preview">
              <AirportPreviewValue label="Elevation" value={airport.elevationFt} unit="ft" />
              <AirportPreviewValue label="Deklination" value={`${airport.magneticDeclinationDeg >= 0 ? "+" : ""}${airport.magneticDeclinationDeg.toFixed(1)}`} unit="°" />
              <AirportPreviewValue label="RWY true / mag" value={`${formatDirection(runway.trueHeadingDeg)}° / ${formatDirection(runway.magneticHeadingDeg)}°`} />
              <AirportPreviewValue label="Slope" value={(runway.slopePercent ?? 0).toFixed(1)} unit="%" />
              <AirportPreviewValue label="Bahnlänge" value={runway.lengthM} unit="m" />
              <AirportPreviewValue label="Bahnbreite" value={runway.widthM} unit="m" />
            </div>
          ) : <div className="airport-status error">OpenAIP liefert für diesen Flugplatz keine aktive Bahn.</div>}
          <div className="airport-sources">
            OpenAIP · Stand {new Date(airport.source.updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
            <br />
            Wetterdaten sind noch nicht angebunden. QNH, OAT und Wind bleiben unverändert.
          </div>
          <button className="airport-apply" type="button" disabled={!runway || !plannedAt} onClick={apply}>Flugplatzwerte übernehmen</button>
        </>
      ) : null}
    </div>
  );
}
