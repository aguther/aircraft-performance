import type { AircraftDefinition } from "../app/aircraft";
import { Plane, RotateCcw, ShieldCheck } from "lucide-react";
import { useAircraft } from "../app/AircraftContext";
import { performanceForAircraft } from "../app/aircraftPerformance";
import { useFlightPlan } from "../app/FlightPlanContext";
import { speedUnitLabel } from "../app/speed";
import { kilometersPerHourToKnots } from "../domain";
import type { WeightBalancePlan } from "../app/FlightPlanContext";

type HomePageProps = {
  aircraft: AircraftDefinition;
  availableAircraft: AircraftDefinition[];
  onResetFlightPlan: () => void;
  onSelectAircraft: (aircraftId: string) => void;
};

type SpeedEntry = {
  label: string;
  detail?: string;
  from?: number;
  to?: number;
  value?: number;
};

function formatSpeedEntry(entry: SpeedEntry, unit: "kt" | "kmh") {
  const speed = (valueKmh: number) => unit === "kt"
    ? Math.round(kilometersPerHourToKnots(valueKmh)).toString()
    : Math.round(valueKmh).toString();
  if (entry.value != null) return `${speed(entry.value)} ${speedUnitLabel(unit)}`;
  if (entry.from != null && entry.to != null) return `${speed(entry.from)}-${speed(entry.to)} ${speedUnitLabel(unit)}`;
  return "–";
}

function defaultPlanForAircraft(aircraft: AircraftDefinition): Partial<WeightBalancePlan> {
  if (aircraft.id === "robin-dr400-180") {
    return {
      registration: aircraft.registrations[0] ?? "D-EDNE",
      startFuelLiters: 189,
      mainFuelLiters: 109,
      wingFuelLiters: 80,
      plannedMainFuelBurnLiters: 0,
      plannedWingFuelBurnLiters: 0,
    };
  }
  return {
    registration: aircraft.registrations[0] ?? "D-EBFT",
    startFuelLiters: 107,
    mainFuelLiters: undefined,
    wingFuelLiters: undefined,
    plannedMainFuelBurnLiters: undefined,
    plannedWingFuelBurnLiters: undefined,
  };
}

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
  const selectAircraft = (aircraftId: string) => {
    const nextAircraft = availableAircraft.find((option) => option.id === aircraftId);
    if (!nextAircraft || nextAircraft.id === aircraft.id) return;
    onResetFlightPlan();
    onSelectAircraft(aircraftId);
    updateWeightBalance(defaultPlanForAircraft(nextAircraft));
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
          <div className="idx-card-kicker"><ShieldCheck aria-hidden="true" /> Limits & Speeds</div>
          <div className="idx-speed-groups">
            <div>
              <div className="idx-mini-heading">Betrieb</div>
              <div className="idx-plan-status">
                {performance.operatingSpeedsKmh.map((entry) => (
                  <span key={entry.label}><b>{entry.label}</b>{formatSpeedEntry(entry, resolvedSpeedUnit)}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="idx-mini-heading">Grenzen</div>
              <div className="idx-plan-status">
                {performance.speedLimitsKmh.map((entry) => (
                  <span title={entry.detail} key={entry.label}><b>{entry.label}</b>{formatSpeedEntry(entry, resolvedSpeedUnit)}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="idx-mini-heading">Markierungen</div>
              <div className="idx-plan-status">
                {performance.speedMarkingsKmh.map((entry) => (
                  <span key={entry.label}><b>{entry.label}</b>{formatSpeedEntry(entry, resolvedSpeedUnit)}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="idx-mini-heading">Lastvielfache</div>
              <div className="idx-plan-status idx-load-status">
                {performance.loadFactors.map((entry) => (
                  <span key={entry.label}><b>{entry.label}</b>{entry.value}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
