import { useMemo, useState } from "react";
import { calculateClimbRate } from "../aircraft/g115b/calculators";
import { kilometersPerHourToKnots } from "../domain";
import { AltitudeInput, type AltitudeInputValue, resolveAltitudeInput } from "../components/AltitudeInput";
import { CalculatorCard, MetricItem, SpeedSymbol } from "../components/CalculatorCard";
import { CalculatorContextCard } from "../components/CalculatorContextCard";
import { SliderField } from "../components/SliderField";

export function ClimbRatePage() {
  const [altitude, setAltitude] = useState<AltitudeInputValue>({
    mode: "alt",
    altitudeFt: 4500,
    flightLevel: 45,
    densityAltitudeFt: 4500,
    qnhHpa: 1013,
    oatC: 6,
  });
  const [massKg, setMassKg] = useState(920);
  const resolvedAltitude = useMemo(() => resolveAltitudeInput(altitude), [altitude]);
  const { atmosphere, densityAltitudeFt, pressureAltitudeFt: referencePressureAltitudeFt } = resolvedAltitude;
  const result = useMemo(
    () => calculateClimbRate({ massKg, densityAltitudeFt, referencePressureAltitudeFt }),
    [massKg, densityAltitudeFt, referencePressureAltitudeFt],
  );

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="section-header">Höhe</div>
          <AltitudeInput value={altitude} onChange={setAltitude} />
        </div>
        <div className="sidebar-section">
          <div className="section-header">Flugzeug</div>
          <SliderField label="Masse" unit="kg" value={massKg} min={750} max={920} inputMax={920} onChange={setMassKg} />
        </div>
      </aside>
      <main className="results">
        {result.warnings.length ? <div className="warnings">{result.warnings.map((warning) => <div className={`warn-item${warning.danger ? " danger" : ""}`} key={warning.text}>{warning.text}</div>)}</div> : null}
        <CalculatorContextCard
          title={atmosphere ? "Kontext" : "Bedingungen"}
          atmosphere={atmosphere ?? undefined}
          atmosphereWarningThresholdFt={10000}
          conditions={result.conditions}
        />
        <CalculatorCard title={`Ergebnis - ${massKg} kg · DA ${densityAltitudeFt.toLocaleString("de-DE")} ft`}>
          <div className="result-grid">
            <MetricItem label="Steigrate · Rate of Climb" value={String(Math.round(result.climbRateFpm))} unit="ft/min" subtext={`${result.climbRateMs.toFixed(1)} m/s`} />
            <MetricItem label={<span><SpeedSymbol index="Y" /> · Climb Speed</span>} value={kilometersPerHourToKnots(result.climbSpeedKmh).toFixed(1)} unit="kt" speedType="IAS" subtext={`${Math.round(result.climbSpeedKmh)} km/h`} />
          </div>
        </CalculatorCard>
      </main>
    </div>
  );
}
