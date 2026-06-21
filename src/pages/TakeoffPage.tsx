import { useEffect, useMemo, useState } from "react";
import { CloudSun, Gauge, Plane, Road } from "lucide-react";
import { calculateTakeoff } from "../aircraft/g115b/calculators";
import type { TakeoffInputs } from "../aircraft/g115b/types";
import { useFlightPlan } from "../app/FlightPlanContext";
import {
  formatSigned,
  interpolate1D,
  kilometersPerHourToKnots,
  knotsToKilometersPerHour,
  pressureAltitudeFromQnh,
  round,
} from "../domain";
import { CalculatorCard, MetricItem, SpeedSymbol } from "../components/CalculatorCard";
import { AirportRunwayInput } from "../components/AirportRunwayInput";
import { CalculatorContextCard } from "../components/CalculatorContextCard";
import { CalculatorInputSection } from "../components/CalculatorInputSection";
import { FlightPlanMassImport } from "../components/FlightPlanMassImport";
import { NumberField } from "../components/NumberField";
import { SliderField } from "../components/SliderField";
import { createPdfBlobFromCanvas, openExportBlob, openExportTab, warmPdfExportModule } from "../export/pdf";
import { takeoffRunwayWarnings, type RunwayDirection } from "../flight-data";
import type { Airport } from "../flight-data";

type TakeoffResult = ReturnType<typeof calculateTakeoff>;
type PressureAltitudeMode = "airport" | "qnh" | "direct";
type ExportContext = {
  pressureAltitudeMode: PressureAltitudeMode;
  elevationFt: number;
  qnhHpa: number;
};
type ChartPoint = readonly [number, number];

const CHART_SOURCE = "/assets/grob115b-takeoff-chart.png";

function formatWindLabel(windKt: number) {
  const windKmh = knotsToKilometersPerHour(windKt);
  if (windKt === 0) return "Kein Wind";
  return `${Math.abs(windKt)} kt (${Math.abs(windKmh).toFixed(1)} km/h) ${windKt > 0 ? "HW" : "TW"}`;
}

function formatSlopeLabel(slopePercent: number) {
  if (slopePercent > 0) return `${slopePercent.toFixed(1)}% bergauf`;
  if (slopePercent < 0) return `${Math.abs(slopePercent).toFixed(1)}% bergab`;
  return "eben";
}

function formatAtmosphereSummary({
  airport,
  elevationFt,
  mode,
  oatC,
  pressureAltitudeFt,
  qnhHpa,
  runway,
  weatherValues,
}: {
  airport?: Airport;
  elevationFt: number;
  mode: PressureAltitudeMode;
  oatC: number;
  pressureAltitudeFt: number;
  qnhHpa: number;
  runway?: RunwayDirection;
  weatherValues?: { qnhHpa?: number; oatC?: number };
}) {
  if (mode === "airport") {
    const airportLabel = airport ? (airport.icaoCode || airport.name) : "Noch kein Flugplatz";
    const runwayLabelText = runway ? ` · RWY ${runway.designator}` : "";
    const displayElevationFt = airport?.elevationFt ?? elevationFt;
    const displayQnhHpa = weatherValues?.qnhHpa ?? qnhHpa;
    const displayOatC = weatherValues?.oatC ?? oatC;
    return `${airportLabel}${runwayLabelText} · Elev ${displayElevationFt.toLocaleString("de-DE")} ft · QNH ${displayQnhHpa} hPa · OAT ${displayOatC} °C`;
  }
  if (mode === "qnh") return `Elevation ${elevationFt.toLocaleString("de-DE")} ft · QNH ${qnhHpa} hPa · PA ${pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${oatC} °C`;
  return `PA ${pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${oatC} °C`;
}

function chartX(
  value: number,
  inputMin: number,
  inputMax: number,
  pixelMin: number,
  pixelMax: number,
) {
  const boundedValue = Math.min(
    Math.max(inputMin, inputMax),
    Math.max(Math.min(inputMin, inputMax), value),
  );
  return pixelMin + ((boundedValue - inputMin) / (inputMax - inputMin)) * (pixelMax - pixelMin);
}

function chartRollY(value: number) {
  return chartX(value, 0, 900, 820, 422);
}

function chartDistanceY(value: number) {
  const distances = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600];
  const scanY = [820, 775, 730, 687, 642, 599, 554, 510, 465, 422, 376, 329, 283, 235, 188, 141, 94];
  return interpolate1D(distances, scanY, value);
}

function createChartPoints(inputs: TakeoffInputs, result: TakeoffResult): ChartPoint[] {
  const windKmh = knotsToKilometersPerHour(inputs.windKt);
  return [
    [chartX(inputs.oatC, -20, 40, 157, 397), 820],
    [chartX(inputs.oatC, -20, 40, 157, 397), chartRollY(result.groundRollByAtmosphereMeters)],
    [415, chartRollY(result.groundRollByAtmosphereMeters)],
    [chartX(inputs.massKg, 920, 750, 415, 650), chartRollY(result.groundRollByMassMeters)],
    [668, chartRollY(result.groundRollByMassMeters)],
    [chartX(Math.abs(inputs.slopePercent), 0, 2, 668, 777), chartRollY(result.groundRollBySlopeMeters)],
    [796, chartRollY(result.groundRollBySlopeMeters)],
    [chartX(Math.abs(windKmh), 0, 40, 796, 1029), chartRollY(result.groundRollByWindMeters)],
    [1047, chartRollY(result.groundRollByWindMeters)],
    [1227, chartDistanceY(result.takeoffDistanceWithoutMarginMeters)],
  ];
}

function CalculationPath({ inputs, result }: { inputs: TakeoffInputs; result: TakeoffResult }) {
  const steps = [
    { name: "Schritt 1 - Atmosphäre", detail: `PA ${inputs.pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${inputs.oatC} °C`, value: `${round(result.groundRollByAtmosphereMeters)} m` },
    { name: "Schritt 2 - Masse", detail: `${round(result.groundRollByAtmosphereMeters)} m · ${inputs.massKg} kg`, value: `${round(result.groundRollByMassMeters)} m` },
    { name: "Schritt 3 - Slope", detail: `${round(result.groundRollByMassMeters)} m · ${formatSlopeLabel(inputs.slopePercent)}`, value: `${round(result.groundRollBySlopeMeters)} m` },
    { name: "Schritt 4 - Wind", detail: `${round(result.groundRollBySlopeMeters)} m · ${formatWindLabel(inputs.windKt)}`, value: `${round(result.groundRollByWindMeters)} m` },
    { name: "Schritt 5 - Hindernis 15 m", detail: `${round(result.groundRollByWindMeters)} m → über 15 m`, value: `${round(result.takeoffDistanceWithoutMarginMeters)} m` },
    { name: `Zuschlag ${inputs.safetyMarginPercent}% auf Rollstrecke`, detail: `+${round(result.groundRollMarginMeters)} m auf Roll- und Startstrecke`, value: `${result.groundRollMeters} m / ${result.takeoffDistanceMeters} m` },
  ];

  return (
    <div className="calculation-path-grid">
      {steps.map((step, index) => (
        <div className="calculation-path-row" key={step.name}>
          <span className="calculation-path-index">{index + 1}</span>
          <div>
            <div className="step-name">{step.name}</div>
            <div className="step-detail">{step.detail}</div>
          </div>
          <div className="step-val">{step.value}</div>
        </div>
      ))}
    </div>
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
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("PNG konnte nicht erzeugt werden.")),
      "image/png",
    );
  });
}

function drawExportText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { color?: string; weight?: number; size?: number },
) {
  context.fillStyle = options.color || "#152235";
  context.font = `${options.weight || 600} ${options.size || 24}px "Segoe UI", Arial, sans-serif`;
  context.fillText(text, x, y);
}

function drawExportField(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  disabled = false,
) {
  context.fillStyle = disabled ? "#edf0f2" : "#f4f8fb";
  context.strokeStyle = disabled ? "#c6cdd3" : "#d8e3eb";
  context.lineWidth = 1;
  context.setLineDash(disabled ? [6, 4] : []);
  context.beginPath();
  context.roundRect(x, y, width, 68, 10);
  context.fill();
  context.stroke();
  context.setLineDash([]);
  drawExportText(context, label.toUpperCase(), x + 14, y + 23, { size: 13, weight: 700, color: disabled ? "#7d878f" : "#607487" });
  drawExportText(context, value, x + 14, y + 52, { size: disabled ? 17 : 20, weight: 700, color: disabled ? "#7d878f" : "#152235" });
}

function drawExportLegend(context: CanvasRenderingContext2D, x: number, y: number) {
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
  drawExportText(context, "Rechenweg ohne Zuschlag", x + 56, y + 7, { size: 17 });
  context.beginPath();
  context.fillStyle = "#00b3ff";
  context.strokeStyle = "#111111";
  context.lineWidth = 3;
  context.arc(x + 650, y, 7, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  drawExportText(context, "Startstrecke über 15 m inkl. Zuschlag", x + 670, y + 7, { size: 17 });
}

function timestamp(date: Date) {
  return date.toISOString().replace("T", " ").replace(/:/g, "-").slice(0, 19);
}

async function exportChartImage(inputs: TakeoffInputs, result: TakeoffResult, exportContext: ExportContext) {
  const { canvas, exportDate } = await createTakeoffExportCanvas(inputs, result, exportContext);
  const blob = await canvasToBlob(canvas);
  await saveExportBlob(blob, `${timestamp(exportDate)}Z Grob G115B Startstreckenberechnung.png`, "image/png");
}

async function exportChartPdf(inputs: TakeoffInputs, result: TakeoffResult, exportContext: ExportContext, options: { openWindow?: Window | null } = {}) {
  const { canvas, exportDate } = await createTakeoffExportCanvas(inputs, result, exportContext);
  const blob = await createPdfBlobFromCanvas(canvas);
  if (options.openWindow) {
    openExportBlob(blob, options.openWindow);
    return;
  }
  await saveExportBlob(blob, `${timestamp(exportDate)}Z Grob G115B Startstreckenberechnung.pdf`, "application/pdf");
}

async function createTakeoffExportCanvas(inputs: TakeoffInputs, result: TakeoffResult, exportContext: ExportContext) {
  const exportDate = new Date();
  const headerHeight = 745;
  const canvas = document.createElement("canvas");
  canvas.width = 1516;
  canvas.height = headerHeight + 1038;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas wird von diesem Browser nicht unterstützt.");
  const image = await loadImage(CHART_SOURCE);
  const points = createChartPoints(inputs, result);
  const finalDistancePoint: ChartPoint = [1227, chartDistanceY(result.takeoffDistanceMeters)];

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawExportText(context, `${timestamp(exportDate)}Z – Grob G115B Startstreckenberechnung`, 48, 54, { size: 30, weight: 700 });
  drawExportText(context, "Eingangswerte", 48, 96, { size: 19, weight: 700, color: "#006f9f" });
  drawExportField(context, "Elevation", exportContext.pressureAltitudeMode !== "direct" ? `${exportContext.elevationFt} ft` : "Nicht bereitgestellt", 48, 112, 338, exportContext.pressureAltitudeMode === "direct");
  drawExportField(context, "QNH", exportContext.pressureAltitudeMode !== "direct" ? `${exportContext.qnhHpa} hPa` : "Nicht bereitgestellt", 402, 112, 338, exportContext.pressureAltitudeMode === "direct");
  drawExportField(context, "Druckhöhe", `${inputs.pressureAltitudeFt} ft`, 756, 112, 338);
  drawExportField(context, "OAT", `${inputs.oatC} °C`, 1110, 112, 302);
  drawExportField(context, "Masse", `${inputs.massKg} kg`, 48, 192, 338);
  drawExportField(context, "Slope", formatSlopeLabel(inputs.slopePercent), 402, 192, 338);
  drawExportField(context, "Wind", formatWindLabel(inputs.windKt), 756, 192, 338);
  drawExportField(context, "Zuschlag", `${inputs.safetyMarginPercent}%`, 1110, 192, 302);
  drawExportText(context, "Berechnete Atmosphärenwerte", 48, 300, { size: 19, weight: 700, color: "#006f9f" });
  drawExportField(context, "Density Altitude", `${result.atmosphere.densityAltitudeFt} ft`, 48, 316, 410);
  drawExportField(context, "ISA-Abweichung", `${formatSigned(result.atmosphere.isaDeviationC, 1)} °C`, 474, 316, 410);
  drawExportText(context, "Ergebnis", 48, 424, { size: 19, weight: 700, color: "#006f9f" });
  drawExportField(context, "Rollstrecke ohne Zuschlag", `${round(result.groundRollByWindMeters)} m`, 48, 440, 664);
  drawExportField(context, "Zuschlag", `${round(result.groundRollMarginMeters)} m`, 728, 440, 684);
  drawExportField(context, "Rollstrecke inkl. Zuschlag", `${result.groundRollMeters} m`, 48, 520, 664);
  drawExportField(context, "Startstrecke über 15 m inkl. Zuschlag", `${result.takeoffDistanceMeters} m`, 728, 520, 684);
  drawExportText(context, result.warnings.length ? `Warnungen: ${result.warnings.map((warning) => warning.text).join(" · ")}` : "Warnungen: keine", 48, 638, { size: 18, color: result.warnings.length ? "#9a5200" : "#526274" });
  drawExportLegend(context, 48, 685);
  context.drawImage(image, 0, headerHeight, 1516, 1038);
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

  return { canvas, exportDate };
}

async function saveExportBlob(blob: Blob, fileName: string, type: string, options: { share?: boolean } = {}) {
  const file = new File([blob], fileName, { type });
  if ((options.share ?? true) && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
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

function TraceabilityCard({ inputs, result, exportContext }: { inputs: TakeoffInputs; result: TakeoffResult; exportContext: ExportContext }) {
  const [view, setView] = useState<"chart" | "path">("chart");
  const [exporting, setExporting] = useState<"png" | "pdf" | "pdf-open" | null>(null);
  const points = createChartPoints(inputs, result);
  const finalDistancePoint: ChartPoint = [1227, chartDistanceY(result.takeoffDistanceMeters)];

  const exportImage = async () => {
    setExporting("png");
    try {
      await exportChartImage(inputs, result, exportContext);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    setExporting("pdf");
    try {
      await exportChartPdf(inputs, result, exportContext);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
    } finally {
      setExporting(null);
    }
  };
  const openPdf = async () => {
    setExporting("pdf-open");
    let exportWindow: Window | null = null;
    try {
      exportWindow = openExportTab();
      await exportChartPdf(inputs, result, exportContext, { openWindow: exportWindow });
    } catch (error) {
      exportWindow?.close();
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <section className="card takeoff-chart-card traceability-card">
      <div className="traceability-header">
        <div>
          <div className="card-title">Nachvollziehbarkeit</div>
          <div className="traceability-description">
            {view === "chart" ? "Rechenweg im originalen Flughandbuchdiagramm" : "Schrittweise Herleitung der berechneten Strecken"}
          </div>
        </div>
      </div>
      <div className="traceability-toolbar">
        <div className="traceability-tabs" role="tablist" aria-label="Nachvollziehbarkeit">
          <button className={view === "chart" ? "active" : ""} type="button" role="tab" aria-selected={view === "chart"} onClick={() => setView("chart")}>Diagramm</button>
          <button className={view === "path" ? "active" : ""} type="button" role="tab" aria-selected={view === "path"} onClick={() => setView("path")}>Rechenweg</button>
        </div>
        {view === "chart" ? (
          <div className="takeoff-chart-actions">
            <button className="takeoff-chart-download" type="button" disabled={exporting !== null} onClick={exportImage}>
              {exporting === "png" ? "Erzeuge PNG…" : "PNG speichern"}
            </button>
            <button className="takeoff-chart-download" type="button" disabled={exporting !== null} onFocus={warmPdfExportModule} onPointerEnter={warmPdfExportModule} onClick={exportPdf}>
              {exporting === "pdf" ? "PDF vorbereiten…" : "PDF speichern"}
            </button>
            <button className="takeoff-chart-download" type="button" disabled={exporting !== null} onFocus={warmPdfExportModule} onPointerEnter={warmPdfExportModule} onClick={openPdf}>
              {exporting === "pdf-open" ? "PDF öffnen…" : "PDF öffnen"}
            </button>
          </div>
        ) : null}
      </div>
      {view === "path" ? <CalculationPath inputs={inputs} result={result} /> : (
        <>
          <div className="takeoff-chart-scroll">
            <div className="takeoff-chart-stage">
              <img className="takeoff-chart-image" src={CHART_SOURCE} alt="Originales Flughandbuchdiagramm Bild 5.3.7 Startstrecke" width="1516" height="1038" />
              <svg className="takeoff-chart-overlay" viewBox="0 0 1516 1038" aria-label="Grafischer Rechenweg im originalen Startstreckendiagramm">
                <polyline className="takeoff-chart-path" points={points.map((point) => point.join(",")).join(" ")} />
                {points.slice(1).map(([x, y], index) => <circle className="takeoff-chart-point" cx={x} cy={y} r="5" key={`${index}-${x}-${y}`} />)}
                <circle className="takeoff-chart-final-point" cx={finalDistancePoint[0]} cy={finalDistancePoint[1]} r="5" />
              </svg>
            </div>
          </div>
          <div className="takeoff-chart-legend">
            <span className="takeoff-chart-key">Unbezuschlagter Weg im Originaldiagramm</span>
            <span>Rollstrecke: {round(result.groundRollByWindMeters)} m</span>
            <span>Startstrecke über 15 m: {round(result.takeoffDistanceWithoutMarginMeters)} m</span>
            <span>Zuschlag: +{round(result.groundRollMarginMeters)} m</span>
            <span className="takeoff-chart-margin-key">Startstrecke über 15 m inkl. Zuschlag: {result.takeoffDistanceMeters} m</span>
          </div>
        </>
      )}
    </section>
  );
}

export function TakeoffPage() {
  const { flightPlan, publishTakeoffStart, updateImports, updateTakeoffCalculator } = useFlightPlan();
  const savedCalculator = flightPlan.takeoffCalculator;
  const [pressureAltitudeMode, setPressureAltitudeMode] = useState<PressureAltitudeMode>(savedCalculator?.pressureAltitudeMode ?? "airport");
  const [elevationFt, setElevationFt] = useState(savedCalculator?.elevationFt ?? 0);
  const [qnhHpa, setQnhHpa] = useState(savedCalculator?.qnhHpa ?? 1013);
  const [directPressureAltitudeFt, setDirectPressureAltitudeFt] = useState(savedCalculator?.directPressureAltitudeFt ?? 0);
  const [oatC, setOatC] = useState(savedCalculator?.oatC ?? 15);
  const [massKg, setMassKg] = useState(savedCalculator?.massKg ?? 920);
  const [slopePercent, setSlopePercent] = useState(savedCalculator?.slopePercent ?? 0);
  const [windKt, setWindKt] = useState(savedCalculator?.windKt ?? 0);
  const [safetyMarginPercent, setSafetyMarginPercent] = useState(savedCalculator?.safetyMarginPercent ?? 15);
  const [selectedAirport, setSelectedAirport] = useState<Airport>();
  const [selectedRunway, setSelectedRunway] = useState<RunwayDirection>();
  const [selectedWeatherValues, setSelectedWeatherValues] = useState<{ qnhHpa?: number; oatC?: number }>();
  const pressureAltitudeFt = pressureAltitudeMode !== "direct"
    ? pressureAltitudeFromQnh(elevationFt, qnhHpa)
    : directPressureAltitudeFt;
  const inputs = useMemo<TakeoffInputs>(() => ({
    pressureAltitudeFt,
    oatC,
    massKg,
    slopePercent,
    windKt,
    safetyMarginPercent,
  }), [pressureAltitudeFt, oatC, massKg, slopePercent, windKt, safetyMarginPercent]);
  const result = useMemo(() => calculateTakeoff(inputs), [inputs]);
  const warnings = useMemo(
    () => [
      ...result.warnings,
      ...takeoffRunwayWarnings(pressureAltitudeMode === "airport" ? selectedRunway : undefined, result.groundRollMeters, result.takeoffDistanceMeters),
    ],
    [pressureAltitudeMode, result, selectedRunway],
  );
  const availableToraM = pressureAltitudeMode === "airport" && selectedRunway
    ? selectedRunway.toraM ?? selectedRunway.lengthM
    : undefined;
  const availableTodaM = pressureAltitudeMode === "airport" ? selectedRunway?.todaM : undefined;
  const groundRollExceedsTora = availableToraM != null && result.groundRollMeters > availableToraM;
  const takeoffDistanceExceedsLimit = (availableToraM != null && result.takeoffDistanceMeters > availableToraM)
    || (availableTodaM != null && result.takeoffDistanceMeters > availableTodaM);

  useEffect(() => {
    document.body.classList.add("runway-calculator", "takeoff-calculator");
    return () => document.body.classList.remove("runway-calculator", "takeoff-calculator");
  }, []);
  useEffect(() => {
    updateTakeoffCalculator({
      pressureAltitudeMode,
      elevationFt,
      qnhHpa,
      directPressureAltitudeFt,
      oatC,
      massKg,
      slopePercent,
      windKt,
      safetyMarginPercent,
    });
  }, [directPressureAltitudeFt, elevationFt, massKg, oatC, pressureAltitudeMode, qnhHpa, safetyMarginPercent, slopePercent, updateTakeoffCalculator, windKt]);
  useEffect(() => {
    if (flightPlan.imports.departureImport) setPressureAltitudeMode("airport");
  }, [flightPlan.imports.departureImport]);
  useEffect(() => {
    publishTakeoffStart({
      pressureAltitudeFt,
      densityAltitudeFt: result.atmosphere.densityAltitudeFt,
      oatC,
      elevationFt: pressureAltitudeMode !== "direct" ? elevationFt : undefined,
      qnhHpa: pressureAltitudeMode !== "direct" ? qnhHpa : undefined,
      airportLabel: selectedAirport ? `${selectedAirport.icaoCode ? `${selectedAirport.icaoCode} · ` : ""}${selectedAirport.name}` : undefined,
      runwayLabel: selectedRunway ? `RWY ${selectedRunway.designator}` : undefined,
    });
  }, [elevationFt, oatC, pressureAltitudeFt, pressureAltitudeMode, publishTakeoffStart, qnhHpa, result.atmosphere.densityAltitudeFt, selectedAirport, selectedRunway]);

  return (
    <div className="page-layout compact-calculator-layout">
      <aside className="sidebar compact-input-panel">
        <CalculatorInputSection
          icon={<CloudSun aria-hidden="true" />}
          title="Atmosphäre"
          description="Flugplatz, Höhe und Wetter"
          summary={formatAtmosphereSummary({
            airport: selectedAirport,
            elevationFt,
            mode: pressureAltitudeMode,
            oatC,
            pressureAltitudeFt,
            qnhHpa,
            runway: selectedRunway,
            weatherValues: selectedWeatherValues,
          })}
        >
          <div className="mode-toggle" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <button className={`mode-btn${pressureAltitudeMode === "airport" ? " active" : ""}`} type="button" onClick={() => setPressureAltitudeMode("airport")}>Airport</button>
            <button className={`mode-btn${pressureAltitudeMode === "qnh" ? " active" : ""}`} type="button" disabled={flightPlan.imports.departureImport} onClick={() => setPressureAltitudeMode("qnh")}>Elevation</button>
            <button className={`mode-btn${pressureAltitudeMode === "direct" ? " active" : ""}`} type="button" disabled={flightPlan.imports.departureImport} onClick={() => setPressureAltitudeMode("direct")}>Pressure Alt.</button>
          </div>
          {pressureAltitudeMode === "airport" ? (
            <>
              <AirportRunwayInput
                operation="departure"
                enabled={flightPlan.imports.departureImport}
                weatherNow={flightPlan.imports.departureWeatherNow}
                onEnabledChange={(value) => updateImports({ departureImport: value })}
                onWeatherNowChange={(enabled) => updateImports({ departureWeatherNow: enabled })}
                onAirportChange={setSelectedAirport}
                onRunwayChange={setSelectedRunway}
                onWeatherValuesChange={setSelectedWeatherValues}
                onApply={(values) => {
                  if (values.elevationFt != null) setElevationFt(values.elevationFt);
                  if (values.qnhHpa != null) setQnhHpa(values.qnhHpa);
                  if (values.oatC != null) setOatC(values.oatC);
                  if (values.windKt != null) setWindKt(values.windKt);
                }}
              />
              <div className="pa-mode airport-manual-weather">
                <SliderField label="QNH" unit="hPa" value={qnhHpa} min={950} max={1050} disabled={flightPlan.imports.departureImport} onChange={setQnhHpa} />
                <SliderField label="OAT" unit="°C" value={oatC} min={-20} max={40} disabled={flightPlan.imports.departureImport} onChange={setOatC} />
              </div>
            </>
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
        </CalculatorInputSection>
        <CalculatorInputSection
          icon={<Plane aria-hidden="true" />}
          title="Flugzeug & Betrieb"
          description="Startmasse"
          summary={`${massKg} kg`}
          defaultOpen={false}
        >
          <FlightPlanMassImport
            label="Startmasse aus Flugplanung"
            massKg={flightPlan.masses?.startMassKg}
            fuelLiters={flightPlan.masses?.startFuelLiters}
            updatedAt={flightPlan.masses?.updatedAt}
            enabled={flightPlan.imports.takeoffMass}
            onEnabledChange={(enabled) => updateImports({ takeoffMass: enabled })}
            onImport={setMassKg}
          />
          <SliderField label="Masse" labelDetail="kg · MTOW 920" unit="kg" value={massKg} min={750} max={920} disabled={flightPlan.imports.takeoffMass} onChange={setMassKg} />
        </CalculatorInputSection>
        <CalculatorInputSection
          icon={<Road aria-hidden="true" />}
          title="Pistenbedingungen"
          description="Neigung, Wind und Zuschlag"
          summary={`${formatSlopeLabel(slopePercent)} · ${formatWindLabel(windKt)} · Zuschlag ${safetyMarginPercent}%`}
          defaultOpen={false}
        >
          <SliderField label="Slope" labelDetail="% · bergauf(+) bergab(−)" unit="%" value={slopePercent} min={-2} max={2} step={0.1} onChange={setSlopePercent} />
          <SliderField label="Wind" labelDetail="kt · HW(+) TW(−)" unit="kt" value={windKt} min={-11} max={22} disabled={flightPlan.imports.departureImport} onChange={setWindKt} />
          <SliderField label="Zuschlag" unit="%" value={safetyMarginPercent} min={0} max={50} inputMax={100} hint="Grasbahn trocken kurzgeschoren: +15% · Hohes Gras/Schnee: mehr · Hartbelag trocken: 0%" onChange={setSafetyMarginPercent} />
        </CalculatorInputSection>
      </aside>
      <main className="results">
        <CalculatorContextCard atmosphere={result.atmosphere} warnings={warnings} conditions={result.conditions} />
        <CalculatorCard title="Startleistung" className="takeoff-primary-results">
          <div className="takeoff-summary-heading">
            <Gauge aria-hidden="true" />
            <span>Berechnete Strecken und Geschwindigkeiten</span>
          </div>
          <div className="result-grid takeoff-distance-grid">
            <MetricItem label="Ground Roll · Startrollstrecke" value={String(result.groundRollMeters)} unit="m" danger={groundRollExceedsTora} />
            <MetricItem label="Takeoff Distance · Startstrecke über 15 m" value={String(result.takeoffDistanceMeters)} unit="m" warn={takeoffDistanceExceedsLimit} />
          </div>
          <div className="takeoff-summary-divider">Geschwindigkeiten</div>
          <div className="speed-grid">
            <MetricItem label={<span><SpeedSymbol index="R" /> · Rotate</span>} value={kilometersPerHourToKnots(result.rotateSpeedKmh).toFixed(1)} unit="kt" speedType="IAS" subtext={`${result.rotateSpeedKmh.toFixed(0)} km/h`} />
            <MetricItem label="in 15 m Höhe" value={kilometersPerHourToKnots(result.speedAt15mKmh).toFixed(1)} unit="kt" speedType="IAS" subtext={`${result.speedAt15mKmh.toFixed(0)} km/h`} />
          </div>
        </CalculatorCard>
        <TraceabilityCard inputs={inputs} result={result} exportContext={{ pressureAltitudeMode, elevationFt, qnhHpa }} />
      </main>
    </div>
  );
}
