import { useEffect, useMemo, useState } from "react";
import { calculateLanding } from "../aircraft/g115b/calculators";
import { g115bData } from "../aircraft/g115b/data";
import type { LandingInputs } from "../aircraft/g115b/types";
import { useFlightPlan } from "../app/FlightPlanContext";
import {
  formatSigned,
  interpolate1D,
  kilometersPerHourToKnots,
  knotsToKilometersPerHour,
  lookup2D,
  pressureAltitudeFromQnh,
  round,
} from "../domain";
import { CalculatorCard, MetricItem, SpeedSymbol } from "../components/CalculatorCard";
import { AirportRunwayInput } from "../components/AirportRunwayInput";
import { CalculatorContextCard } from "../components/CalculatorContextCard";
import { FlightPlanMassImport } from "../components/FlightPlanMassImport";
import { NumberField } from "../components/NumberField";
import { SliderField } from "../components/SliderField";

type LandingResult = ReturnType<typeof calculateLanding>;
type PressureAltitudeMode = "airport" | "qnh" | "direct";
type ExportContext = {
  pressureAltitudeMode: PressureAltitudeMode;
  elevationFt: number;
  qnhHpa: number;
};
type ChartPoint = readonly [number, number];

const CHART_SOURCE = "/assets/grob115b-landing-chart.png";

function formatWindLabel(windKt: number) {
  const windKmh = knotsToKilometersPerHour(windKt);
  if (windKt === 0) return "Kein Wind";
  return `${Math.abs(windKt)} kt (${Math.abs(windKmh).toFixed(1)} km/h) ${windKt > 0 ? "HW" : "TW"}`;
}

function chartAxisPosition(value: number, values: readonly number[], pixels: readonly number[]) {
  return interpolate1D(values, pixels, Math.min(values[values.length - 1], Math.max(values[0], value)));
}

function chartTemperatureX(value: number) {
  return chartAxisPosition(value, [-20, -10, 0, 10, 20, 30, 40], [212.5, 259.5, 304.5, 347.5, 391.5, 436.5, 480.5]);
}

function chartMassX(value: number) {
  return chartAxisPosition(value, [700, 750, 800, 850, 920], [729.5, 684, 638, 592, 528]);
}

function chartWindX(value: number) {
  const maximumWindKmh = value < 0 ? 20 : 40;
  return chartAxisPosition(Math.min(maximumWindKmh, Math.abs(value)), [0, 10, 20, 30, 40], [776, 821, 866, 911, 956]);
}

function chartRollY(value: number) {
  return chartAxisPosition(value, [0, 100, 200, 300, 400], [849, 752, 655, 560, 466]);
}

function chartWindPoint(windKmh: number, incomingRollMeters: number, correctedRollMeters: number): ChartPoint {
  if (windKmh > 0 && correctedRollMeters <= 0 && incomingRollMeters > 0) {
    const rawCorrectionAtMaximumHeadwind = lookup2D(
      g115bData.landing.landingRollFromHeadwind,
      incomingRollMeters,
      40,
    );
    const zeroCrossingKmh = 40 * incomingRollMeters / (incomingRollMeters - rawCorrectionAtMaximumHeadwind);
    return [chartWindX(Math.min(windKmh, zeroCrossingKmh)), chartRollY(0)];
  }
  return [chartWindX(windKmh), chartRollY(correctedRollMeters)];
}

function chartDistanceY(value: number) {
  return interpolate1D(
    [0, 100, 200, 300, 400, 500, 600, 700, 800],
    [895, 800, 704, 609, 514, 418, 322, 227, 132],
    value,
  );
}

function chartObstaclePoints(landingRollMeters: number, landingDistanceMeters: number): ChartPoint[] {
  const rawEntryRollMeters = interpolate1D(
    g115bData.landing.landingDistanceOver15m.landingDistanceMeters,
    g115bData.landing.landingDistanceOver15m.landingRollBreakpoints,
    landingDistanceMeters,
  );
  if (rawEntryRollMeters < 0) {
    const entryX = interpolate1D([rawEntryRollMeters, landingDistanceMeters], [1000, 1178], 0);
    return [[entryX, chartRollY(0)], [1178, chartDistanceY(landingDistanceMeters)]];
  }
  return [[1000, chartRollY(landingRollMeters)], [1178, chartDistanceY(landingDistanceMeters)]];
}

function createChartPoints(inputs: LandingInputs, result: LandingResult): ChartPoint[] {
  const windKmh = knotsToKilometersPerHour(inputs.windKt);
  return [
    [chartTemperatureX(inputs.oatC), 849],
    [chartTemperatureX(inputs.oatC), chartRollY(result.landingRollByAtmosphereChartMeters)],
    [528, chartRollY(result.landingRollByAtmosphereChartMeters)],
    [chartMassX(inputs.massKg), chartRollY(result.landingRollByMassChartMeters)],
    [776, chartRollY(result.landingRollByMassChartMeters)],
    chartWindPoint(windKmh, result.landingRollByMassChartMeters, result.landingRollByWindChartMeters),
    [1000, chartRollY(result.landingRollByWindChartMeters)],
    ...chartObstaclePoints(result.landingRollByWindChartMeters, result.landingDistanceWithoutMarginMeters),
  ];
}

function PipelineCard({ inputs, result }: { inputs: LandingInputs; result: LandingResult }) {
  const steps = [
    { name: "Schritt 1 - Atmosphäre", detail: `PA ${inputs.pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${inputs.oatC} °C`, value: `${round(result.landingRollByAtmosphereMeters)} m` },
    { name: "Schritt 2 - Masse", detail: `${round(result.landingRollByAtmosphereMeters)} m · ${inputs.massKg} kg`, value: `${round(result.landingRollByMassMeters)} m` },
    { name: "Schritt 3 - Wind", detail: `${round(result.landingRollByMassMeters)} m · ${formatWindLabel(inputs.windKt)}`, value: `${round(result.landingRollByWindMeters)} m` },
    { name: "Schritt 4 - Hindernis 15 m", detail: `${round(result.landingRollByWindMeters)} m → über 15 m`, value: `${round(result.landingDistanceWithoutMarginMeters)} m` },
    { name: `Zuschlag ${inputs.safetyMarginPercent}% auf Rollstrecke`, detail: `+${round(result.landingRollMarginMeters)} m auf Roll- und Landestrecke`, value: `${result.landingRollMeters} m / ${result.landingDistanceMeters} m` },
  ];
  return (
    <CalculatorCard title="Rechenweg">
      <div className="pipeline">
        {steps.map((step, index) => (
          <div className="step" key={step.name}>
            <div className="step-rail">
              <div className={`step-dot${index === steps.length - 1 ? " active" : ""}`} />
              {index < steps.length - 1 ? <div className="step-line" /> : null}
            </div>
            <div className="step-body">
              <div className="step-name">{step.name}</div>
              <div className="step-detail">{step.detail}</div>
            </div>
            <div className="step-val">{step.value}</div>
          </div>
        ))}
      </div>
    </CalculatorCard>
  );
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG konnte nicht erzeugt werden.")), "image/png");
  });
}

function drawText(context: CanvasRenderingContext2D, text: string, x: number, y: number, options: { color?: string; weight?: number; size?: number }) {
  context.fillStyle = options.color || "#152235";
  context.font = `${options.weight || 600} ${options.size || 24}px "Segoe UI", Arial, sans-serif`;
  context.fillText(text, x, y);
}

function drawField(context: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, width: number, disabled = false) {
  context.fillStyle = disabled ? "#edf0f2" : "#f4f8fb";
  context.strokeStyle = disabled ? "#c6cdd3" : "#d8e3eb";
  context.lineWidth = 1;
  context.setLineDash(disabled ? [6, 4] : []);
  context.beginPath();
  context.roundRect(x, y, width, 68, 10);
  context.fill();
  context.stroke();
  context.setLineDash([]);
  drawText(context, label.toUpperCase(), x + 14, y + 23, { size: 13, weight: 700, color: disabled ? "#7d878f" : "#607487" });
  drawText(context, value, x + 14, y + 52, { size: disabled ? 17 : 20, weight: 700, color: disabled ? "#7d878f" : "#152235" });
}

function drawLegend(context: CanvasRenderingContext2D, x: number, y: number) {
  context.strokeStyle = "#e90000";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + 42, y);
  context.stroke();
  context.beginPath();
  context.fillStyle = "#e90000";
  context.arc(x + 21, y, 6, 0, Math.PI * 2);
  context.fill();
  drawText(context, "Rechenweg ohne Zuschlag", x + 56, y + 7, { size: 17 });
  context.beginPath();
  context.fillStyle = "#00b3ff";
  context.strokeStyle = "#111111";
  context.lineWidth = 3;
  context.arc(x + 650, y, 7, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  drawText(context, "Landestrecke über 15 m inkl. Zuschlag", x + 670, y + 7, { size: 17 });
}

function timestamp(date: Date) {
  return date.toISOString().replace("T", " ").replace(/:/g, "-").slice(0, 19);
}

async function exportChartImage(inputs: LandingInputs, result: LandingResult, exportContext: ExportContext) {
  const exportDate = new Date();
  const headerHeight = 745;
  const canvas = document.createElement("canvas");
  canvas.width = 1505;
  canvas.height = headerHeight + 1045;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas wird von diesem Browser nicht unterstützt.");
  const image = await loadImage(CHART_SOURCE);
  const points = createChartPoints(inputs, result);
  const finalDistancePoint: ChartPoint = [1178, chartDistanceY(result.landingDistanceMeters)];

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawText(context, `${timestamp(exportDate)}Z – Grob G115B Landestreckenberechnung`, 48, 54, { size: 30, weight: 700 });
  drawText(context, "Eingangswerte", 48, 96, { size: 19, weight: 700, color: "#006f9f" });
  drawField(context, "Elevation", exportContext.pressureAltitudeMode !== "direct" ? `${exportContext.elevationFt} ft` : "Nicht bereitgestellt", 48, 112, 338, exportContext.pressureAltitudeMode === "direct");
  drawField(context, "QNH", exportContext.pressureAltitudeMode !== "direct" ? `${exportContext.qnhHpa} hPa` : "Nicht bereitgestellt", 402, 112, 338, exportContext.pressureAltitudeMode === "direct");
  drawField(context, "Druckhöhe", `${inputs.pressureAltitudeFt} ft`, 756, 112, 338);
  drawField(context, "OAT", `${inputs.oatC} °C`, 1110, 112, 302);
  drawField(context, "Masse", `${inputs.massKg} kg`, 48, 192, 338);
  drawField(context, "Wind", formatWindLabel(inputs.windKt), 402, 192, 338);
  drawField(context, "Zuschlag", `${inputs.safetyMarginPercent}%`, 756, 192, 338);
  drawText(context, "Berechnete Atmosphärenwerte", 48, 300, { size: 19, weight: 700, color: "#006f9f" });
  drawField(context, "Density Altitude", `${result.atmosphere.densityAltitudeFt} ft`, 48, 316, 410);
  drawField(context, "ISA-Abweichung", `${formatSigned(result.atmosphere.isaDeviationC, 1)} °C`, 474, 316, 410);
  drawText(context, "Ergebnis", 48, 424, { size: 19, weight: 700, color: "#006f9f" });
  drawField(context, "Rollstrecke ohne Zuschlag", `${round(result.landingRollByWindMeters)} m`, 48, 440, 664);
  drawField(context, "Zuschlag", `${round(result.landingRollMarginMeters)} m`, 728, 440, 684);
  drawField(context, "Rollstrecke inkl. Zuschlag", `${result.landingRollMeters} m`, 48, 520, 664);
  drawField(context, "Landestrecke über 15 m inkl. Zuschlag", `${result.landingDistanceMeters} m`, 728, 520, 684);
  drawText(context, result.warnings.length ? `Warnungen: ${result.warnings.map((warning) => warning.text).join(" · ")}` : "Warnungen: keine", 48, 638, { size: 18, color: result.warnings.length ? "#9a5200" : "#526274" });
  drawLegend(context, 48, 685);
  context.drawImage(image, 0, headerHeight, 1505, 1045);
  context.save();
  context.translate(0, headerHeight);
  context.strokeStyle = "#e90000";
  context.lineWidth = 5;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
  context.stroke();
  points.slice(1).forEach(([x, y]) => {
    context.beginPath();
    context.fillStyle = "#e90000";
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
  });
  context.beginPath();
  context.fillStyle = "#00b3ff";
  context.strokeStyle = "#111111";
  context.lineWidth = 3;
  context.arc(finalDistancePoint[0], finalDistancePoint[1], 6, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
  const blob = await canvasToBlob(canvas);
  const fileName = `${timestamp(exportDate)}Z Grob G115B Landestreckenberechnung.png`;
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Grob G115B Landestreckenberechnung" });
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function ChartCard({ inputs, result, exportContext }: { inputs: LandingInputs; result: LandingResult; exportContext: ExportContext }) {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [exporting, setExporting] = useState(false);
  const points = createChartPoints(inputs, result);
  const finalDistancePoint: ChartPoint = [1178, chartDistanceY(result.landingDistanceMeters)];
  const exportImage = async () => {
    setExporting(true);
    try {
      await exportChartImage(inputs, result, exportContext);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
    } finally {
      setExporting(false);
    }
  };
  return (
    <section className="card takeoff-chart-card">
      <div className="takeoff-chart-header">
        <div className="card-title">Grafische Nachvollziehbarkeit</div>
        <div className="takeoff-chart-actions">
          <label className="takeoff-chart-toggle">
            <input type="checkbox" checked={overlayVisible} onChange={(event) => setOverlayVisible(event.target.checked)} />
            <span>Rechenweg</span>
          </label>
          <button className="takeoff-chart-download" type="button" disabled={exporting} onClick={exportImage}>
            {exporting ? "Erzeuge PNG…" : "Als Bild speichern"}
          </button>
        </div>
      </div>
      <div className="takeoff-chart-scroll">
        <div className={`takeoff-chart-stage${overlayVisible ? "" : " overlay-hidden"}`}>
          <img className="takeoff-chart-image" src={CHART_SOURCE} alt="Originales Flughandbuchdiagramm Bild 5.3.15 Landestrecke" width="1505" height="1045" />
          <svg className="takeoff-chart-overlay" viewBox="0 0 1505 1045" aria-label="Grafischer Rechenweg im originalen Landestreckendiagramm">
            <polyline className="takeoff-chart-path" points={points.map((point) => point.join(",")).join(" ")} />
            {points.slice(1).map(([x, y], index) => <circle className="takeoff-chart-point" cx={x} cy={y} r="5" key={`${index}-${x}-${y}`} />)}
            <circle className="takeoff-chart-final-point" cx={finalDistancePoint[0]} cy={finalDistancePoint[1]} r="5" />
          </svg>
        </div>
      </div>
      <div className="takeoff-chart-legend">
        <span className="takeoff-chart-key">Unbezuschlagter Weg im Originaldiagramm</span>
        <span>Rollstrecke: {round(result.landingRollByWindMeters)} m</span>
        <span>Landestrecke über 15 m: {round(result.landingDistanceWithoutMarginMeters)} m</span>
        <span>Zuschlag: +{round(result.landingRollMarginMeters)} m</span>
        <span className="takeoff-chart-margin-key">Landestrecke über 15 m inkl. Zuschlag: {result.landingDistanceMeters} m</span>
      </div>
    </section>
  );
}

export function LandingPage() {
  const { flightPlan } = useFlightPlan();
  const [pressureAltitudeMode, setPressureAltitudeMode] = useState<PressureAltitudeMode>("airport");
  const [elevationFt, setElevationFt] = useState(0);
  const [qnhHpa, setQnhHpa] = useState(1013);
  const [directPressureAltitudeFt, setDirectPressureAltitudeFt] = useState(0);
  const [oatC, setOatC] = useState(15);
  const [massKg, setMassKg] = useState(920);
  const [windKt, setWindKt] = useState(0);
  const [safetyMarginPercent, setSafetyMarginPercent] = useState(40);
  const pressureAltitudeFt = pressureAltitudeMode !== "direct" ? pressureAltitudeFromQnh(elevationFt, qnhHpa) : directPressureAltitudeFt;
  const inputs = useMemo<LandingInputs>(() => ({
    pressureAltitudeFt,
    oatC,
    massKg,
    windKt,
    safetyMarginPercent,
  }), [pressureAltitudeFt, oatC, massKg, windKt, safetyMarginPercent]);
  const result = useMemo(() => calculateLanding(inputs), [inputs]);

  useEffect(() => {
    document.body.classList.add("runway-calculator");
    return () => document.body.classList.remove("runway-calculator");
  }, []);

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="section-header">Atmosphäre</div>
          <div className="mode-toggle" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <button className={`mode-btn${pressureAltitudeMode === "airport" ? " active" : ""}`} type="button" onClick={() => setPressureAltitudeMode("airport")}>Airport</button>
            <button className={`mode-btn${pressureAltitudeMode === "qnh" ? " active" : ""}`} type="button" onClick={() => setPressureAltitudeMode("qnh")}>Elevation</button>
            <button className={`mode-btn${pressureAltitudeMode === "direct" ? " active" : ""}`} type="button" onClick={() => setPressureAltitudeMode("direct")}>Pressure Alt.</button>
          </div>
          {pressureAltitudeMode === "airport" ? (
            <AirportRunwayInput operation="arrival" onApply={(values) => {
              setElevationFt(values.elevationFt);
            }} />
          ) : pressureAltitudeMode === "qnh" ? (
            <div className="pa-mode">
              <NumberField label="Elevation" unit="ft" value={elevationFt} step={10} onChange={setElevationFt} />
              <SliderField label="QNH" unit="hPa" value={qnhHpa} min={950} max={1050} onChange={setQnhHpa} />
              <div className="derived-box">
                <div className="derived-label">Pressure Altitude</div>
                <div className="derived-value">{pressureAltitudeFt.toLocaleString("de-DE")} ft</div>
              </div>
            </div>
          ) : (
            <div className="pa-mode">
              <NumberField label="Pressure Altitude" unit="ft" value={directPressureAltitudeFt} step={100} onChange={setDirectPressureAltitudeFt} />
            </div>
          )}
          {pressureAltitudeMode !== "airport" ? <div style={{ marginTop: "1.25rem" }}><SliderField label="OAT" unit="°C" value={oatC} min={-20} max={40} onChange={setOatC} /></div> : null}
        </div>
        <div className="sidebar-section">
          <div className="section-header">Flugzeug</div>
          <FlightPlanMassImport
            label="Landemasse aus Flugplanung"
            massKg={flightPlan.masses?.landingMassKg}
            fuelLiters={flightPlan.masses?.landingFuelLiters}
            updatedAt={flightPlan.masses?.updatedAt}
            currentMassKg={massKg}
            onImport={setMassKg}
          />
          <SliderField label="Masse" labelDetail="kg · MTOW 920" unit="kg" value={massKg} min={700} max={920} onChange={setMassKg} />
        </div>
        <div className="sidebar-section">
          <div className="section-header">Pistenbedingungen</div>
          <SliderField label="Wind" labelDetail="kt · HW(+) TW(−)" unit="kt" value={windKt} min={-11} max={22} onChange={setWindKt} />
        </div>
        <div className="sidebar-section">
          <div className="section-header">Betrieblicher Zuschlag</div>
          <SliderField label="Zuschlag" unit="%" value={safetyMarginPercent} min={0} max={60} inputMax={100} hint="Trockene Grasbahn: +40% · Hartbelag trocken: 0%" onChange={setSafetyMarginPercent} />
        </div>
      </aside>
      <main className="results">
        <CalculatorContextCard atmosphere={result.atmosphere} warnings={result.warnings} conditions={result.conditions} />
        <PipelineCard inputs={inputs} result={result} />
        <CalculatorCard title="Ergebnis">
          <div className="result-grid">
            <MetricItem label="Landing Roll · Landerollstrecke" value={String(result.landingRollMeters)} unit="m" />
            <MetricItem label="Landing Distance · Landestrecke über 15 m" value={String(result.landingDistanceMeters)} unit="m" />
          </div>
        </CalculatorCard>
        <CalculatorCard title="Anfluggeschwindigkeiten">
          <div className="speed-grid">
            <MetricItem label={<span><SpeedSymbol index="APP" /> · Approach</span>} value={kilometersPerHourToKnots(result.approachSpeedKmh).toFixed(1)} unit="kt" speedType="IAS" subtext={`${result.approachSpeedKmh.toFixed(0)} km/h`} />
            <MetricItem label={<span><SpeedSymbol index="REF" /> · 1.3 × <SpeedSymbol index="S0" /></span>} value={kilometersPerHourToKnots(result.referenceSpeedKmh).toFixed(1)} unit="kt" speedType="IAS" subtext={`${result.referenceSpeedKmh.toFixed(0)} km/h`} />
          </div>
        </CalculatorCard>
        <ChartCard inputs={inputs} result={result} exportContext={{ pressureAltitudeMode, elevationFt, qnhHpa }} />
      </main>
    </div>
  );
}
