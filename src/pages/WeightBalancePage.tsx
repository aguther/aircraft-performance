import { useEffect, useMemo } from "react";
import { Gauge, Weight } from "lucide-react";
import { calculateWeightBalance, isPointInPolygon } from "../aircraft/g115b/calculators";
import { g115bData } from "../aircraft/g115b/data";
import { useFlightPlan } from "../app/FlightPlanContext";
import { interpolate1D, kilometersPerHourToKnots } from "../domain";
import { CalculatorCard, MetricItem, SpeedSymbol } from "../components/CalculatorCard";
import { CalculatorInputSection } from "../components/CalculatorInputSection";
import { SliderField } from "../components/SliderField";

type WeightBalanceResult = ReturnType<typeof calculateWeightBalance>;

function deriveLandingResult(startResult: WeightBalanceResult, plannedFuelBurnLiters: number): WeightBalanceResult {
  const data = g115bData.weightBalance;
  const burnedFuelLiters = Math.min(startResult.stations[4].massKg / data.fuelDensityKgPerLiter, Math.max(0, plannedFuelBurnLiters));
  const burnedFuelMassKg = burnedFuelLiters * data.fuelDensityKgPerLiter;
  const burnedFuelMomentKgM = burnedFuelMassKg * data.stations.fuel.armM;
  const totalMassKg = startResult.totalMassKg - burnedFuelMassKg;
  const totalMomentKgM = startResult.totalMomentKgM - burnedFuelMomentKgM;
  const cgArmM = totalMomentKgM / totalMassKg;
  const withinEnvelope = isPointInPolygon({ massKg: totalMassKg, momentKgM: totalMomentKgM }, data.envelope);
  const fuelMassKg = startResult.fuelMassKg - burnedFuelMassKg;
  const warnings = [];
  if (!withinEnvelope) warnings.push({ text: "Landeschwerpunkt/Moment liegt außerhalb des Envelope.", danger: true });

  const stallIdleFlaps40Kmh = interpolate1D(g115bData.stall.massBreakpoints, g115bData.stall.speedsKmh.idle.flaps40, totalMassKg);
  return {
    ...startResult,
    warnings,
    fuelMassKg,
    totalMassKg,
    totalMomentKgM,
    cgArmM,
    withinEnvelope,
    stations: startResult.stations.map((station) => station.label === "Kraftstoff"
      ? { ...station, massKg: fuelMassKg, momentKgM: fuelMassKg * station.armM }
      : station),
    speeds: {
      rotateSpeedKmh: interpolate1D(g115bData.takeoff.rotateSpeedMassBreakpoints, g115bData.takeoff.rotateSpeedKmh, totalMassKg),
      speedAt15mKmh: interpolate1D(g115bData.takeoff.rotateSpeedMassBreakpoints, g115bData.takeoff.speedAt15mKmh, totalMassKg),
      approachSpeedKmh: interpolate1D(g115bData.landing.approachSpeedMassBreakpoints, g115bData.landing.approachSpeedKmh, totalMassKg),
      stallIdleFlaps40Kmh,
      referenceSpeedKmh: stallIdleFlaps40Kmh * 1.3,
    },
  };
}

function EnvelopeChart({ startResult, landingResult }: { startResult: WeightBalanceResult; landingResult: WeightBalanceResult }) {
  const envelope = g115bData.weightBalance.envelope;
  const results = [startResult, landingResult];
  const minMoment =
    Math.min(...envelope.map((point) => point.momentKgM), ...results.map((result) => result.totalMomentKgM)) - 8;
  const maxMoment =
    Math.max(...envelope.map((point) => point.momentKgM), ...results.map((result) => result.totalMomentKgM)) + 8;
  const minMass =
    Math.min(...envelope.map((point) => point.massKg), ...results.map((result) => result.totalMassKg)) - 14;
  const maxMass =
    Math.max(...envelope.map((point) => point.massKg), ...results.map((result) => result.totalMassKg)) + 14;
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
        <div className="wb-chart-legend"><span className="start">Start</span><span className="landing">Landung</span></div>
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
        <line
          className="wb-flight-line"
          x1={x(startResult.totalMomentKgM)}
          y1={y(startResult.totalMassKg)}
          x2={x(landingResult.totalMomentKgM)}
          y2={y(landingResult.totalMassKg)}
        />
        {results.map((result, index) => (
          <circle
            className={`wb-current-point ${index === 0 ? "start" : "landing"}${result.withinEnvelope ? "" : " danger"}`}
            cx={x(result.totalMomentKgM).toFixed(1)}
            cy={y(result.totalMassKg).toFixed(1)}
            r={7}
            key={index}
          />
        ))}
      </svg>
      <div className="wb-chart-axis-footer">
        <span>Moment [kg m]</span>
      </div>
    </div>
  );
}

function BreakdownTable({
  startResult,
  landingResult,
  plannedFuelBurnLiters,
}: {
  startResult: WeightBalanceResult;
  landingResult: WeightBalanceResult;
  plannedFuelBurnLiters: number;
}) {
  const burnedFuelMassKg = startResult.fuelMassKg - landingResult.fuelMassKg;
  const burnedFuelMomentKgM = startResult.totalMomentKgM - landingResult.totalMomentKgM;
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
        {startResult.stations.map((station) => (
          <tr key={station.label}>
            <td>{station.label}</td>
            <td>{station.massKg.toFixed(1)} kg</td>
            <td>{station.armM.toFixed(4)} m</td>
            <td>{station.momentKgM.toFixed(2)} kg m</td>
          </tr>
        ))}
        <tr className="wb-total-row">
          <td>Gesamt · Start</td>
          <td>{startResult.totalMassKg.toFixed(1)} kg</td>
          <td>{startResult.cgArmM.toFixed(4)} m</td>
          <td>{startResult.totalMomentKgM.toFixed(2)} kg m</td>
        </tr>
        <tr className="wb-burn-row">
          <td>− Verbrauch · {plannedFuelBurnLiters.toFixed(1)} l</td>
          <td>−{burnedFuelMassKg.toFixed(1)} kg</td>
          <td>{g115bData.weightBalance.stations.fuel.armM.toFixed(4)} m</td>
          <td>−{burnedFuelMomentKgM.toFixed(2)} kg m</td>
        </tr>
        <tr className="wb-total-row landing">
          <td>Gesamt · Landung</td>
          <td>{landingResult.totalMassKg.toFixed(1)} kg</td>
          <td>{landingResult.cgArmM.toFixed(4)} m</td>
          <td>{landingResult.totalMomentKgM.toFixed(2)} kg m</td>
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
    () => deriveLandingResult(startResult, plan.plannedFuelBurnLiters),
    [plan.plannedFuelBurnLiters, startResult],
  );

  useEffect(() => {
    publishMasses({
      startMassKg: startResult.totalMassKg,
      landingMassKg: landingResult.totalMassKg,
      startFuelLiters: plan.startFuelLiters,
      landingFuelLiters,
    });
  }, [landingFuelLiters, landingResult.totalMassKg, plan.startFuelLiters, publishMasses, startResult.totalMassKg]);
  useEffect(() => {
    document.body.classList.add("weight-balance-calculator");
    return () => document.body.classList.remove("weight-balance-calculator");
  }, []);

  return (
    <div className="page-layout compact-calculator-layout">
      <aside className="sidebar compact-input-panel">
        <CalculatorInputSection
          icon={<Weight aria-hidden="true" />}
          title="Beladung"
          description="Besatzung, Gepäck und Kraftstoff"
          summary={`Start ${startResult.totalMassKg.toFixed(1)} kg · Landung ${landingResult.totalMassKg.toFixed(1)} kg`}
        >
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
        </CalculatorInputSection>
      </aside>
      <main className="results">
        <CalculatorCard title="Flugplanung" className="weight-balance-primary-results">
          <div className="takeoff-summary-heading">
            <Gauge aria-hidden="true" />
            <span>{plan.registration} · Start bis Landung</span>
          </div>
          <div className="wb-summary">
            <div className="result-grid weight-balance-result-grid">
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
            <div className="conditions-grid wb-planning-conditions">
              {startResult.conditions.map((condition) => <span key={condition}>{condition}</span>)}
              <span>Landung = Start − geplanter Kraftstoffverbrauch</span>
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
        <CalculatorCard title="Envelope · Start und Landung">
          <EnvelopeChart startResult={startResult} landingResult={landingResult} />
        </CalculatorCard>
        <CalculatorCard title="Geschwindigkeiten" className="weight-balance-speed-results">
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
        <CalculatorCard title="Beladung · Start bis Landung">
          <BreakdownTable startResult={startResult} landingResult={landingResult} plannedFuelBurnLiters={plan.plannedFuelBurnLiters} />
        </CalculatorCard>
      </main>
    </div>
  );
}
