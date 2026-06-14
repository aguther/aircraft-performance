import { Link } from "react-router-dom";

export function FlightPlanMassImport({
  label,
  massKg,
  fuelLiters,
  updatedAt,
  currentMassKg,
  onImport,
}: {
  label: string;
  massKg?: number;
  fuelLiters?: number;
  updatedAt?: string;
  currentMassKg: number;
  onImport: (massKg: number) => void;
}) {
  if (massKg === undefined || fuelLiters === undefined || updatedAt === undefined) {
    return (
      <div className="flight-plan-import empty">
        <div className="flight-plan-import-label">{label}</div>
        <div className="flight-plan-import-copy">Noch keine Masse aus Weight & Balance verfügbar.</div>
        <Link to="/weight_balance.html">Weight & Balance öffnen</Link>
      </div>
    );
  }

  const alreadyImported = Math.abs(currentMassKg - massKg) < 0.05;
  return (
    <div className="flight-plan-import">
      <div>
        <div className="flight-plan-import-label">{label}</div>
        <div className="flight-plan-import-value">{massKg.toFixed(1)} kg</div>
        <div className="flight-plan-import-copy">
          {fuelLiters.toFixed(1)} l Kraftstoff · W&B {new Date(updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
        </div>
      </div>
      <button type="button" disabled={alreadyImported} onClick={() => onImport(massKg)}>
        {alreadyImported ? "Übernommen" : "Masse übernehmen"}
      </button>
    </div>
  );
}
