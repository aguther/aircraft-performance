import { useMemo, useState } from "react";
import { calculateWeightBalance } from "../aircraft/g115b/calculators";
import { g115bData } from "../aircraft/g115b/data";
import { kilometersPerHourToKnots } from "../domain";
import { CalculatorCard, MetricItem, SpeedSymbol } from "../components/CalculatorCard";
import { SliderField } from "../components/SliderField";

type WeightBalanceResult = ReturnType<typeof calculateWeightBalance>;

const DEFAULT_AIRCRAFT = "D-EBFT";
const DEFAULT_PILOT_MASS_KG = 85;
const DEFAULT_COPILOT_MASS_KG = 0;
const DEFAULT_BAGGAGE_MASS_KG = 0;
const DEFAULT_FUEL_LITERS = 107;

function EnvelopeChart({ result }: { result: WeightBalanceResult }) {
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
        <span>Masse [kg]</span>
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
  const [aircraftName, setAircraftName] = useState(DEFAULT_AIRCRAFT);
  const [pilotMassKg, setPilotMassKg] = useState(DEFAULT_PILOT_MASS_KG);
  const [copilotMassKg, setCopilotMassKg] = useState(DEFAULT_COPILOT_MASS_KG);
  const [baggageMassKg, setBaggageMassKg] = useState(DEFAULT_BAGGAGE_MASS_KG);
  const [fuelLiters, setFuelLiters] = useState(DEFAULT_FUEL_LITERS);

  const result = useMemo(
    () =>
      calculateWeightBalance({
        aircraftName,
        pilotMassKg,
        copilotMassKg,
        baggageMassKg,
        fuelLiters,
      }),
    [aircraftName, pilotMassKg, copilotMassKg, baggageMassKg, fuelLiters],
  );

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
                className={`mode-btn${aircraft.name === aircraftName ? " active" : ""}`}
                type="button"
                key={aircraft.name}
                onClick={() => setAircraftName(aircraft.name)}
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
            value={pilotMassKg}
            min={0}
            max={130}
            inputMax={150}
            onChange={setPilotMassKg}
          />
          <SliderField
            label="Co-Pilot"
            unit="kg"
            value={copilotMassKg}
            min={0}
            max={130}
            inputMax={150}
            onChange={setCopilotMassKg}
          />
          <SliderField
            label="Gepäck"
            unit="kg"
            value={baggageMassKg}
            min={0}
            max={20}
            onChange={setBaggageMassKg}
          />
          <SliderField
            label="Kraftstoff"
            unit="l"
            value={fuelLiters}
            min={0}
            max={107}
            inputMax={130}
            hint="Kraftstoffmasse mit 0,72 kg/l."
            onChange={setFuelLiters}
          />
        </div>
      </aside>
      <main className="results">
        <CalculatorCard title="Weight & Balance">
          <div className="wb-summary">
            <div className="result-grid">
              <MetricItem
                label="Masse"
                value={result.totalMassKg.toFixed(1)}
                unit="kg"
                subtext={
                  result.withinEnvelope ? "Innerhalb Envelope" : "Ausserhalb Envelope"
                }
                danger={!result.withinEnvelope}
              />
              <MetricItem
                label="Moment"
                value={result.totalMomentKgM.toFixed(2)}
                unit="kg m"
                subtext={`Arm ${result.cgArmM.toFixed(4)} m`}
                danger={!result.withinEnvelope}
              />
            </div>
            {result.warnings.length > 0 ? (
              <div className="wb-inline-warnings">
                {result.warnings.map((warning) => (
                  <div
                    className={`wb-inline-warning${warning.danger ? " danger" : ""}`}
                    key={warning.text}
                  >
                    {warning.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </CalculatorCard>
        <CalculatorCard title="Envelope">
          <EnvelopeChart result={result} />
        </CalculatorCard>
        <CalculatorCard title="Geschwindigkeiten">
          <div className="speed-grid">
            <SpeedMetric
              label={
                <span>
                  <SpeedSymbol index="R" /> · Rotate
                </span>
              }
              speedKmh={result.speeds.rotateSpeedKmh}
            />
            <SpeedMetric label="in 15 m Höhe" speedKmh={result.speeds.speedAt15mKmh} />
            <SpeedMetric
              label={
                <span>
                  <SpeedSymbol index="APP" /> · Approach
                </span>
              }
              speedKmh={result.speeds.approachSpeedKmh}
            />
            <SpeedMetric
              label={
                <span>
                  <SpeedSymbol index="REF" /> · 1.3 × <SpeedSymbol index="S0" />
                </span>
              }
              speedKmh={result.speeds.referenceSpeedKmh}
            />
            <SpeedMetric
              label={
                <span>
                  <SpeedSymbol index="S0" /> · Leerlauf 40°
                </span>
              }
              speedKmh={result.speeds.stallIdleFlaps40Kmh}
            />
          </div>
        </CalculatorCard>
        <CalculatorCard title="Beladung">
          <BreakdownTable result={result} />
        </CalculatorCard>
        <CalculatorCard title="Bedingungen">
          <div className="conditions-grid">
            {result.conditions.map((condition) => (
              <span key={condition}>{condition}</span>
            ))}
          </div>
        </CalculatorCard>
      </main>
    </div>
  );
}
