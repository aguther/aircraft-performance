import { useEffect, useMemo } from "react";
import { calculateWeightBalance } from "../aircraft/g115b/calculators";
import { g115bData } from "../aircraft/g115b/data";
import { useFlightPlan } from "../app/FlightPlanContext";
import { kilometersPerHourToKnots } from "../domain";
import { CalculatorCard, MetricItem, SpeedSymbol } from "../components/CalculatorCard";
import { SliderField } from "../components/SliderField";

type WeightBalanceResult = ReturnType<typeof calculateWeightBalance>;

function EnvelopeChart({ result, label }: { result: WeightBalanceResult; label: string }) {
  const envelope = g115bData.weightBalance.envelope;
  const minMoment =
    Math.min(...envelope.map((point) => point.momentKgM), result.totalMomentKgM) - 8;
  const maxMoment =
    Math.max(...envelope.map((point) => point.momentKgM), result.totalMomentKgM) + 8;
  const minMass =
    Math.min(...envelope.map((point) => point.massKg), result.totalMassKg) - 14;
  const maxMass =
    Math.max(...envelope.map((point) => point.massKg), result.totalMassKg) + 14;
  const width = 680;
  const height = 300;
  const padding = { top: 18, right: 18, bottom: 34, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (moment: number) =>
    padding.left + ((moment - minMoment) / (maxMoment - minMoment)) * plotWidth;
  const y = (mass: number) =>
    padding.top + (1 - (mass - minMass) / (maxMass - minMass)) * plotHeight;
  const polygonPoints = envelope
    .map((point) => `${x(point.momentKgM).toFixed(1)},${y(point.massKg).toFixed(1)}`)
    .join(" ");
  const massTicks = [750, 840, 920];
  const momentTicks = [150, 180, 210, 240, 270];

  return (
    <div className="wb-chart-wrap">
      <div className="wb-chart-axis-key">
        <span>{label} · Masse [kg]</span>
      </div>
      <svg
        className="wb-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Weight and balance envelope"
      >
        {massTicks.map((tick) => (
          <line
            className="wb-grid-line"
            x1={padding.left}
            y1={y(tick)}
            x2={width - padding.right}
            y2={y(tick)}
            key={`mass-grid-${tick}`}
          />
        ))}
        {momentTicks.map((tick) => (
          <line
            className="wb-grid-line"
            x1={x(tick)}
            y1={padding.top}
            x2={x(tick)}
            y2={height - padding.bottom}
            key={`moment-grid-${tick}`}
          />
        ))}
        <polygon className="wb-envelope" points={polygonPoints} />
        <polyline
          className="wb-envelope-line"
          points={`${polygonPoints} ${polygonPoints.split(" ")[0]}`}
        />
        {massTicks.map((tick) => (
          <text className="wb-axis-label" x={16} y={y(tick) + 4} key={`mass-${tick}`}>
            {tick}
          </text>
        ))}
        {momentTicks.map((tick) => (
          <text
            className="wb-axis-label"
            x={x(tick)}
            y={height - 16}
            textAnchor="middle"
            key={`moment-${tick}`}
          >
            {tick}
          </text>
        ))}
        <circle
          className={`wb-current-point${result.withinEnvelope ? "" : " danger"}`}
          cx={x(result.totalMomentKgM).toFixed(1)}
          cy={y(result.totalMassKg).toFixed(1)}
          r={6}
        />
      </svg>
      <div className="wb-chart-axis-footer">
        <span>Moment [kg m]</span>
      </div>
    </div>
  );
}

function BreakdownTable({ result }: { result: WeightBalanceResult }) {
  return (
    <table className="breakdown-table wb-breakdown">
      <thead>
        <tr>
          <th>Wert</th>
          <th>Masse</th>
          <th>Arm</th>
          <th>Moment</th>
        </tr>
      </thead>
      <tbody>
        {result.stations.map((station) => (
          <tr key={station.label}>
            <td>{station.label}</td>
            <td>{station.massKg.toFixed(1)} kg</td>
            <td>{station.armM.toFixed(4)} m</td>
            <td>{station.momentKgM.toFixed(2)} kg m</td>
          </tr>
        ))}
        <tr className="wb-total-row">
          <td>Gesamt</td>
          <td>{result.totalMassKg.toFixed(1)} kg</td>
          <td>{result.cgArmM.toFixed(4)} m</td>
          <td>{result.totalMomentKgM.toFixed(2)} kg m</td>
        </tr>
      </tbody>
    </table>
  );
}

function SpeedMetric({
  label,
  speedKmh,
}: {
  label: React.ReactNode;
  speedKmh: number;
}) {
  return (
    <MetricItem
      label={label}
      value={kilometersPerHourToKnots(speedKmh).toFixed(1)}
      unit="kt"
      speedType="IAS"
      subtext={`${Math.round(speedKmh)} km/h`}
    />
  );
}

export function WeightBalancePage() {
  const { flightPlan, updateWeightBalance, publishMasses } = useFlightPlan();
  const plan = flightPlan.weightBalance;
  const landingFuelLiters = Math.max(0, plan.startFuelLiters - plan.plannedFuelBurnLiters);
  const startResult = useMemo(
    () =>
      calculateWeightBalance({
        aircraftName: plan.registration,
        pilotMassKg: plan.pilotMassKg,
        copilotMassKg: plan.copilotMassKg,
        baggageMassKg: plan.baggageMassKg,
        fuelLiters: plan.startFuelLiters,
      }),
    [plan.registration, plan.pilotMassKg, plan.copilotMassKg, plan.baggageMassKg, plan.startFuelLiters],
  );
  const landingResult = useMemo(
    () => calculateWeightBalance({
      aircraftName: plan.registration,
      pilotMassKg: plan.pilotMassKg,
      copilotMassKg: plan.copilotMassKg,
      baggageMassKg: plan.baggageMassKg,
      fuelLiters: landingFuelLiters,
    }),
    [plan.registration, plan.pilotMassKg, plan.copilotMassKg, plan.baggageMassKg, landingFuelLiters],
  );

  useEffect(() => {
    publishMasses({
      startMassKg: startResult.totalMassKg,
      landingMassKg: landingResult.totalMassKg,
      startFuelLiters: plan.startFuelLiters,
      landingFuelLiters,
    });
  }, [landingFuelLiters, landingResult.totalMassKg, plan.startFuelLiters, publishMasses, startResult.totalMassKg]);

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="section-header">Flugzeug</div>
          <div
            className="mode-toggle"
            style={{
              gridTemplateColumns: `repeat(${g115bData.weightBalance.emptyAircraft.length}, 1fr)`,
            }}
          >
            {g115bData.weightBalance.emptyAircraft.map((aircraft) => (
              <button
                className={`mode-btn${aircraft.name === plan.registration ? " active" : ""}`}
                type="button"
                key={aircraft.name}
                onClick={() => updateWeightBalance({ registration: aircraft.name })}
              >
                {aircraft.name}
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-section">
          <div className="section-header">Beladung</div>
          <SliderField
            label="Pilot"
            unit="kg"
            value={plan.pilotMassKg}
            min={0}
            max={130}
            inputMax={150}
            onChange={(pilotMassKg) => updateWeightBalance({ pilotMassKg })}
          />
          <SliderField
            label="Co-Pilot"
            unit="kg"
            value={plan.copilotMassKg}
            min={0}
            max={130}
            inputMax={150}
            onChange={(copilotMassKg) => updateWeightBalance({ copilotMassKg })}
          />
          <SliderField
            label="Gepäck"
            unit="kg"
            value={plan.baggageMassKg}
            min={0}
            max={20}
            onChange={(baggageMassKg) => updateWeightBalance({ baggageMassKg })}
          />
          <SliderField
            label="Kraftstoff beim Start"
            unit="l"
            value={plan.startFuelLiters}
            min={0}
            max={107}
            inputMax={130}
            hint="Kraftstoffmasse mit 0,72 kg/l."
            onChange={(startFuelLiters) => updateWeightBalance({ startFuelLiters })}
          />
          <SliderField
            label="Geplanter Verbrauch"
            unit="l"
            value={plan.plannedFuelBurnLiters}
            min={0}
            max={107}
            inputMax={130}
            hint={`Verbleibend bei Landung: ${landingFuelLiters.toFixed(1)} l`}
            onChange={(plannedFuelBurnLiters) => updateWeightBalance({ plannedFuelBurnLiters })}
          />
        </div>
      </aside>
      <main className="results">
        <CalculatorCard title="Flugplanung">
          <div className="wb-summary">
            <div className="result-grid">
              <MetricItem
                label="Startmasse"
                value={startResult.totalMassKg.toFixed(1)}
                unit="kg"
                subtext={
                  startResult.withinEnvelope ? `${plan.startFuelLiters.toFixed(1)} l Kraftstoff · zentral gespeichert` : "Ausserhalb Envelope"
                }
                danger={!startResult.withinEnvelope}
              />
              <MetricItem
                label="Landemasse"
                value={landingResult.totalMassKg.toFixed(1)}
                unit="kg"
                subtext={
                  landingResult.withinEnvelope ? `${landingFuelLiters.toFixed(1)} l Kraftstoff · zentral gespeichert` : "Ausserhalb Envelope"
                }
                danger={!landingResult.withinEnvelope}
              />
            </div>
            {plan.plannedFuelBurnLiters > plan.startFuelLiters ? (
              <div className="wb-inline-warnings">
                <div className="wb-inline-warning danger">Geplanter Verbrauch überschreitet den Kraftstoff beim Start.</div>
              </div>
            ) : null}
            {[...startResult.warnings, ...landingResult.warnings].length > 0 ? (
              <div className="wb-inline-warnings">
                {[...startResult.warnings, ...landingResult.warnings].map((warning, index) => (
                  <div
                    className={`wb-inline-warning${warning.danger ? " danger" : ""}`}
                    key={`${warning.text}-${index}`}
                  >
                    {warning.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </CalculatorCard>
        <CalculatorCard title="Envelope · Start">
          <EnvelopeChart result={startResult} label="Start" />
        </CalculatorCard>
        <CalculatorCard title="Envelope · Landung">
          <EnvelopeChart result={landingResult} label="Landung" />
        </CalculatorCard>
        <CalculatorCard title="Geschwindigkeiten">
          <div className="speed-grid">
            <SpeedMetric
              label={
                <span>
                  <SpeedSymbol index="R" /> · Rotate
                </span>
              }
              speedKmh={startResult.speeds.rotateSpeedKmh}
            />
            <SpeedMetric label="in 15 m Höhe" speedKmh={startResult.speeds.speedAt15mKmh} />
            <SpeedMetric
              label={
                <span>
                  <SpeedSymbol index="APP" /> · Approach
                </span>
              }
              speedKmh={landingResult.speeds.approachSpeedKmh}
            />
            <SpeedMetric
              label={
                <span>
                  <SpeedSymbol index="REF" /> · 1.3 × <SpeedSymbol index="S0" />
                </span>
              }
              speedKmh={landingResult.speeds.referenceSpeedKmh}
            />
            <SpeedMetric
              label={
                <span>
                  <SpeedSymbol index="S0" /> · Leerlauf 40°
                </span>
              }
              speedKmh={landingResult.speeds.stallIdleFlaps40Kmh}
            />
          </div>
        </CalculatorCard>
        <CalculatorCard title="Beladung · Start">
          <BreakdownTable result={startResult} />
        </CalculatorCard>
        <CalculatorCard title="Beladung · Landung">
          <BreakdownTable result={landingResult} />
        </CalculatorCard>
        <CalculatorCard title="Bedingungen">
          <div className="conditions-grid">
            {startResult.conditions.map((condition) => (
              <span key={condition}>{condition}</span>
            ))}
          </div>
        </CalculatorCard>
      </main>
    </div>
  );
}
