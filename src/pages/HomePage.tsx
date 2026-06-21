import type { AircraftDefinition } from "../app/aircraft";
import { Link } from "react-router-dom";
import { Plane, RotateCcw, ShieldCheck, Weight } from "lucide-react";
import { useAircraft } from "../app/AircraftContext";
import { performanceForAircraft } from "../app/aircraftPerformance";
import { useFlightPlan } from "../app/FlightPlanContext";
import { speedText } from "../app/speed";

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
  const { resolvedSpeedUnit } = useAircraft();
  const { flightPlan, updateWeightBalance } = useFlightPlan();
  const performance = performanceForAircraft(aircraft);
  const plan = flightPlan.weightBalance;
  const selectedEmptyAircraft =
    performance.data.weightBalance.emptyAircraft.find((entry) => entry.name === plan.registration) ??
    performance.data.weightBalance.emptyAircraft[0];
  const startFuelLiters = aircraft.id === "robin-dr400-180"
    ? (plan.mainFuelLiters ?? 109) + (plan.wingFuelLiters ?? 80)
    : plan.startFuelLiters;
  const startFuelMassKg = startFuelLiters * performance.data.weightBalance.fuelDensityKgPerLiter;
  const selectAircraft = (aircraftId: string) => {
    const nextAircraft = availableAircraft.find((option) => option.id === aircraftId);
    onSelectAircraft(aircraftId);
    if (!nextAircraft) return;
    updateWeightBalance({
      registration: nextAircraft.registrations[0] ?? plan.registration,
      startFuelLiters: nextAircraft.id === "robin-dr400-180" ? 189 : Math.min(plan.startFuelLiters, 107),
      mainFuelLiters: nextAircraft.id === "robin-dr400-180" ? 109 : undefined,
      wingFuelLiters: nextAircraft.id === "robin-dr400-180" ? 80 : undefined,
    });
  };

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
            onChange={(event) => selectAircraft(event.target.value)}
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
                onClick={() => updateWeightBalance({
                  registration,
                  startFuelLiters: aircraft.id === "robin-dr400-180" ? 189 : plan.startFuelLiters,
                  mainFuelLiters: aircraft.id === "robin-dr400-180" ? 109 : undefined,
                  wingFuelLiters: aircraft.id === "robin-dr400-180" ? 80 : undefined,
                })}
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
            <div><span>Startkraftstoff</span><strong>{startFuelLiters.toFixed(1)} l</strong></div>
            <div><span>Kraftstoffmasse</span><strong>{startFuelMassKg.toFixed(1)} kg</strong></div>
            <div><span>MTOW</span><strong>{performance.limits.takeoffMassMaxKg} kg</strong></div>
            <div><span>Landung max.</span><strong>{performance.limits.landingMassMaxKg} kg</strong></div>
          </div>
        </div>
        <div className="idx-aircraft-card">
          <div className="idx-card-kicker"><ShieldCheck aria-hidden="true" /> Limits & Speeds</div>
          <div className="idx-plan-status">
            <span>V<sub>R</sub> {speedText(performance.overviewSpeedsKmh.takeoff, resolvedSpeedUnit)}</span>
            <span>15 m {speedText(performance.overviewSpeedsKmh.obstacle, resolvedSpeedUnit)}</span>
            <span>V<sub>APP</sub> {speedText(performance.overviewSpeedsKmh.approach, resolvedSpeedUnit)}</span>
            <span>Touchdown {speedText(performance.overviewSpeedsKmh.landingTouchdown, resolvedSpeedUnit)}</span>
            <span>V<sub>Y</sub> {speedText(performance.overviewSpeedsKmh.climbVy, resolvedSpeedUnit)}</span>
            <span>Gleiten {speedText(performance.overviewSpeedsKmh.glide, resolvedSpeedUnit)}</span>
          </div>
          <Link className="idx-secondary-link" to="/weight_balance.html">Beladung bearbeiten</Link>
        </div>
      </section>
    </main>
  );
}
