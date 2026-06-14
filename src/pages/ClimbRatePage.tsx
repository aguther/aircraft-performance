import { useMemo, useState } from "react";
import { calculateClimbRate } from "../aircraft/g115b/calculators";
import {
  densityAltitude,
  flightLevelToFeet,
  formatSigned,
  kilometersPerHourToKnots,
  pressureAltitudeFromQnh,
} from "../domain";
import { CalculatorCard, MetricItem, SpeedSymbol } from "../components/CalculatorCard";
import { NumberField } from "../components/NumberField";
import { SliderField } from "../components/SliderField";

type HeightMode = "alt" | "fl" | "da";

export function ClimbRatePage() {
  const [mode, setMode] = useState<HeightMode>("alt");
  const [altitudeFt, setAltitudeFt] = useState(4500);
  const [flightLevel, setFlightLevel] = useState(45);
  const [directDensityAltitudeFt, setDirectDensityAltitudeFt] = useState(4500);
  const [qnhHpa, setQnhHpa] = useState(1013);
  const [oatC, setOatC] = useState(6);
  const [massKg, setMassKg] = useState(920);
  const atmosphere = useMemo(() => {
    if (mode === "da") return null;
    const pressureAltitudeFt = mode === "alt"
      ? pressureAltitudeFromQnh(altitudeFt, qnhHpa)
      : flightLevelToFeet(flightLevel);
    return { pressureAltitudeFt, ...densityAltitude(pressureAltitudeFt, oatC) };
  }, [mode, altitudeFt, qnhHpa, flightLevel, oatC]);
  const densityAltitudeFt = atmosphere?.densityAltitudeFt ?? directDensityAltitudeFt;
  const referencePressureAltitudeFt = atmosphere?.pressureAltitudeFt ?? directDensityAltitudeFt;
  const result = useMemo(
    () => calculateClimbRate({ massKg, densityAltitudeFt, referencePressureAltitudeFt }),
    [massKg, densityAltitudeFt, referencePressureAltitudeFt],
  );

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="section-header">Höhe</div>
          <div className="mode-toggle" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            {([["alt", "Altitude"], ["fl", "Flight Level"], ["da", "Density Alt."]] as const).map(([value, label]) => (
              <button className={`mode-btn${mode === value ? " active" : ""}`} type="button" onClick={() => setMode(value)} key={value}>{label}</button>
            ))}
          </div>
          {mode === "alt" ? <div className="pa-mode"><NumberField label="Flughöhe" unit="ft" value={altitudeFt} step={100} onChange={setAltitudeFt} /><SliderField label="QNH" unit="hPa" value={qnhHpa} min={950} max={1050} onChange={setQnhHpa} /></div> : null}
          {mode === "fl" ? <div className="pa-mode"><NumberField label="Flight Level" unit="FL" value={flightLevel} step={5} onChange={setFlightLevel} /></div> : null}
          {mode === "da" ? <div className="pa-mode"><NumberField label="Density Altitude" unit="ft" value={directDensityAltitudeFt} step={100} onChange={setDirectDensityAltitudeFt} /></div> : null}
          {mode !== "da" ? <div style={{ marginTop: "1.25rem" }}><SliderField label="OAT" unit="°C" value={oatC} min={-40} max={50} onChange={setOatC} /></div> : null}
          {mode !== "da" ? <div className="derived-box"><div className="derived-label">Density Altitude</div><div className="derived-value">{densityAltitudeFt.toLocaleString("de-DE")} ft</div></div> : null}
        </div>
        <div className="sidebar-section">
          <div className="section-header">Flugzeug</div>
          <SliderField label="Masse" unit="kg" value={massKg} min={750} max={920} inputMax={920} step={5} onChange={setMassKg} />
        </div>
      </aside>
      <main className="results">
        {result.warnings.length ? <div className="warnings">{result.warnings.map((warning) => <div className={`warn-item${warning.danger ? " danger" : ""}`} key={warning.text}>{warning.text}</div>)}</div> : null}
        {atmosphere ? (
          <CalculatorCard title="Kontext">
            <div className="context-card-body">
              <div className="atmos-grid">
                <div className="atmos-item"><div className="atmos-item-label">Density Altitude</div><div className={`atmos-item-value${densityAltitudeFt > 10000 ? " warn" : ""}`}>{densityAltitudeFt.toLocaleString("de-DE")} <span>ft</span></div></div>
                <div className="atmos-item"><div className="atmos-item-label">ISA-Abweichung</div><div className={`atmos-item-value${Math.abs(atmosphere.isaDeviationC) < 0.1 ? "" : atmosphere.isaDeviationC > 0 ? " warn" : " good"}`}>{formatSigned(atmosphere.isaDeviationC, 1)} <span>°C</span></div></div>
              </div>
              <div className="context-card-block"><div className="context-divider">Bedingungen</div><div className="conditions-grid">{result.conditions.map((condition) => <span key={condition}>{condition}</span>)}</div></div>
            </div>
          </CalculatorCard>
        ) : (
          <CalculatorCard title="Bedingungen"><div className="conditions-grid">{result.conditions.map((condition) => <span key={condition}>{condition}</span>)}</div></CalculatorCard>
        )}
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
