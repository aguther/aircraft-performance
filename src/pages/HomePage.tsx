import type { AircraftDefinition } from "../app/aircraft";
import { Link } from "react-router-dom";
import { Plane, RotateCcw, ShieldCheck, Weight } from "lucide-react";
import { g115bData } from "../aircraft/g115b/data";
import { useFlightPlan } from "../app/FlightPlanContext";

type HomePageProps = {
  aircraft: AircraftDefinition;
  availableAircraft: AircraftDefinition[];
  onResetFlightPlan: () => void;
  onSelectAircraft: (aircraftId: string) => void;
};

export function HomePage({
  aircraft,
  availableAircraft,
  onResetFlightPlan,
  onSelectAircraft,
}: HomePageProps) {
  const { flightPlan, updateWeightBalance } = useFlightPlan();
  const plan = flightPlan.weightBalance;
  const selectedEmptyAircraft =
    g115bData.weightBalance.emptyAircraft.find((entry) => entry.name === plan.registration) ??
    g115bData.weightBalance.emptyAircraft[0];
  const startFuelMassKg = plan.startFuelLiters * g115bData.weightBalance.fuelDensityKgPerLiter;

  return (
    <main className="idx-shell">
      <section className="idx-hero">
        <div className="idx-hero-copy">
          <div className="idx-section">Flugplanung</div>
          <h1>{aircraft.shortName} · {plan.registration}</h1>
          <p>Flugzeug festlegen, Planungsdaten prüfen und danach die passenden Rechner öffnen.</p>
        </div>
        <button className="idx-reset-button" type="button" onClick={onResetFlightPlan}>
          <RotateCcw aria-hidden="true" />
          <span>Neue Planung</span>
        </button>
      </section>

      <section className="idx-aircraft-panel">
        <div className="idx-aircraft-card idx-aircraft-select-card">
          <div className="idx-card-kicker"><Plane aria-hidden="true" /> Flugzeug</div>
          <label className="idx-control-label" htmlFor="idx-aircraft-type">Muster</label>
          <select
            className="idx-aircraft-select"
            id="idx-aircraft-type"
            value={aircraft.id}
            disabled={availableAircraft.length < 2}
            onChange={(event) => onSelectAircraft(event.target.value)}
          >
            {availableAircraft.map((option) => <option value={option.id} key={option.id}>{option.shortName}</option>)}
          </select>
          <div className="idx-control-label">Konkretes Flugzeug</div>
          <div
            className="idx-registration-options"
            style={{ gridTemplateColumns: `repeat(${aircraft.registrations.length}, minmax(0, 1fr))` }}
          >
            {aircraft.registrations.map((registration) => (
              <button
                className={registration === plan.registration ? "active" : ""}
                type="button"
                aria-pressed={registration === plan.registration}
                key={registration}
                onClick={() => updateWeightBalance({ registration })}
              >
                {registration}
              </button>
            ))}
          </div>
        </div>
        <div className="idx-aircraft-card">
          <div className="idx-card-kicker"><Weight aria-hidden="true" /> Beladungsbasis</div>
          <div className="idx-aircraft-metrics">
            <div><span>Leermasse</span><strong>{selectedEmptyAircraft.massKg.toFixed(1)} kg</strong></div>
            <div><span>Leerarm</span><strong>{selectedEmptyAircraft.armM.toFixed(4)} m</strong></div>
            <div><span>Startkraftstoff</span><strong>{plan.startFuelLiters.toFixed(1)} l</strong></div>
            <div><span>Kraftstoffmasse</span><strong>{startFuelMassKg.toFixed(1)} kg</strong></div>
          </div>
        </div>
        <div className="idx-aircraft-card">
          <div className="idx-card-kicker"><ShieldCheck aria-hidden="true" /> Planung</div>
          <div className="idx-plan-status">
            <span>Pilot {plan.pilotMassKg} kg</span>
            <span>Co-Pilot {plan.copilotMassKg} kg</span>
            <span>Gepäck {plan.baggageMassKg} kg</span>
            <span>Verbrauch {plan.plannedFuelBurnLiters.toFixed(1)} l</span>
          </div>
          <Link className="idx-secondary-link" to="/weight_balance.html">Beladung bearbeiten</Link>
        </div>
      </section>
    </main>
  );
}
