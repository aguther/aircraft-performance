import type { Airport, DataSource, WeatherForecast } from "../flight-data";

let pdfModulePromise: Promise<typeof import("jspdf")> | null = null;

export function preloadPdfExportModule() {
  pdfModulePromise ??= import("jspdf").catch((error) => {
    pdfModulePromise = null;
    throw error;
  });
  return pdfModulePromise;
}

export function warmPdfExportModule() {
  void preloadPdfExportModule().catch(() => undefined);
}

type PdfCanvasOptions = {
  maxDimensionPx?: number;
  orientation?: "portrait" | "landscape";
};

export type PdfProvenanceData = {
  airport?: Airport;
  weather?: WeatherForecast;
};

export const PILOT_RESPONSIBILITY_NOTICE = "Daten ohne Gewähr. Der verantwortliche Pilot ist verpflichtet, sämtliche verwendeten Flugplatz-, Bahn- und Wetterdaten anhand der offiziellen Quellen nachzuprüfen. Die volle Verantwortung für Datenprüfung, Flugvorbereitung und Flugdurchführung verbleibt beim Piloten.";

export function formatPdfUtc(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unbekannt";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

function weatherSourceLine(label: string, source: DataSource, validAt: string) {
  const model = source.model ?? "Quelle nicht ausgewiesen";
  const retrievedAt = formatPdfUtc(source.retrievedAt);
  if (source.provider === "Aviation Weather Center" && model.startsWith("METAR")) {
    return `${label}: Aviation Weather Center · METAR · Beobachtung ${formatPdfUtc(validAt)} · Abruf ${retrievedAt}.`;
  }
  if (source.provider === "Aviation Weather Center" && model.startsWith("TAF")) {
    const issuedAt = source.updatedAt ? ` · Ausgabe ${formatPdfUtc(source.updatedAt)}` : "";
    return `${label}: Aviation Weather Center · TAF · gültig ab ${formatPdfUtc(validAt)}${issuedAt} · Abruf ${retrievedAt}.`;
  }
  if (source.provider === "Open-Meteo") {
    const modelRun = source.modelRunAt ? formatPdfUtc(source.modelRunAt) : "vom Anbieter nicht übermittelt";
    return `${label}: Open-Meteo · ${model} · verwendet für ${formatPdfUtc(validAt)} · Modelllauf ${modelRun} · Abruf ${retrievedAt}.`;
  }
  return `${label}: ${source.provider} · ${model} · verwendet für ${formatPdfUtc(validAt)} · Abruf ${retrievedAt}.`;
}

export function pdfProvenanceLines({ airport, weather }: PdfProvenanceData) {
  const lines: string[] = [];
  if (airport) {
    const updatedAt = airport.source.updatedAt ? ` · Datenstand ${formatPdfUtc(airport.source.updatedAt)}` : "";
    lines.push(`Flugplatz/Bahn: OpenAIP${updatedAt} · Abruf ${formatPdfUtc(airport.source.retrievedAt)}.`);
  } else {
    lines.push("Flugplatz-/Bahndaten: keine Online-Daten übernommen.");
  }

  if (!weather) {
    lines.push("Wetterwerte: manuelle Eingabe; keine Online-Wetterquelle übernommen.");
    return lines;
  }

  if (weather.source.provider === "Aviation Weather Center" && weather.source.model?.startsWith("TAF")) {
    lines.push(weatherSourceLine("Wetter (Wind)", weather.source, weather.validAt));
    if (weather.baseForecast) lines.push(weatherSourceLine("Wetter (QNH/OAT)", weather.baseForecast.source, weather.baseForecast.validAt));
    return lines;
  }

  lines.push(weatherSourceLine("Wetter", weather.source, weather.validAt));
  return lines;
}

function wrappedLines(context: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function composePdfProvenance(
  canvas: HTMLCanvasElement,
  data: PdfProvenanceData,
  insertionY: number,
  separator: "before" | "after",
) {
  if (!Number.isFinite(insertionY) || insertionY < 0 || insertionY > canvas.height) {
    throw new RangeError(`Ungültige Einfügeposition für die PDF-Datenbasis: ${insertionY}.`);
  }
  const sourceLines = pdfProvenanceLines(data);
  const measureContext = canvas.getContext("2d");
  if (!measureContext) throw new Error("Canvas wird von diesem Browser nicht unterstützt.");
  const margin = 48;
  const contentWidth = canvas.width - margin * 2;
  const sourceLineHeight = 21;
  const noticeLineHeight = 22;
  measureContext.font = '500 14px "Segoe UI", Arial, sans-serif';
  const wrappedSourceLines = sourceLines.flatMap((line) => wrappedLines(measureContext, line, contentWidth));
  measureContext.font = '700 14px "Segoe UI", Arial, sans-serif';
  const wrappedNoticeLines = wrappedLines(measureContext, PILOT_RESPONSIBILITY_NOTICE, contentWidth);
  const blockHeight = 36 + 25 + wrappedSourceLines.length * sourceLineHeight + 14 + wrappedNoticeLines.length * noticeLineHeight + 34;
  const target = document.createElement("canvas");
  target.width = canvas.width;
  target.height = canvas.height + blockHeight;
  const context = target.getContext("2d");
  if (!context) throw new Error("Canvas wird von diesem Browser nicht unterstützt.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, target.width, target.height);
  if (insertionY === canvas.height) {
    context.drawImage(canvas, 0, 0);
  } else {
    context.drawImage(canvas, 0, 0, canvas.width, insertionY, 0, 0, canvas.width, insertionY);
    const lowerHeight = canvas.height - insertionY;
    context.drawImage(canvas, 0, insertionY, canvas.width, lowerHeight, 0, insertionY + blockHeight, canvas.width, lowerHeight);
  }
  context.fillStyle = "#f5f8fa";
  context.fillRect(0, insertionY, target.width, blockHeight);
  context.strokeStyle = "#cbd8e2";
  context.lineWidth = 2;
  context.beginPath();
  const separatorY = separator === "before" ? insertionY + 1 : insertionY + blockHeight - 1;
  context.moveTo(margin, separatorY);
  context.lineTo(target.width - margin, separatorY);
  context.stroke();

  let y = insertionY + 36;
  context.fillStyle = "#006f9f";
  context.font = '700 18px "Segoe UI", Arial, sans-serif';
  context.fillText("Datenbasis", margin, y);
  y += 25;
  context.fillStyle = "#526274";
  context.font = '500 14px "Segoe UI", Arial, sans-serif';
  wrappedSourceLines.forEach((line) => {
    context.fillText(line, margin, y);
    y += sourceLineHeight;
  });
  y += 14;
  context.fillStyle = "#7a2f00";
  context.font = '700 14px "Segoe UI", Arial, sans-serif';
  wrappedNoticeLines.forEach((line) => {
    context.fillText(line, margin, y);
    y += noticeLineHeight;
  });
  return target;
}

export function appendPdfProvenance(canvas: HTMLCanvasElement, data: PdfProvenanceData) {
  return composePdfProvenance(canvas, data, canvas.height, "before");
}

export function insertPdfProvenance(canvas: HTMLCanvasElement, data: PdfProvenanceData, insertionY: number) {
  return composePdfProvenance(canvas, data, insertionY, "after");
}

function scaleCanvasForPdf(canvas: HTMLCanvasElement, maxDimensionPx?: number) {
  if (!maxDimensionPx || Math.max(canvas.width, canvas.height) <= maxDimensionPx) return canvas;
  const scale = maxDimensionPx / Math.max(canvas.width, canvas.height);
  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  scaledCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  const context = scaledCanvas.getContext("2d");
  if (!context) throw new Error("Canvas wird von diesem Browser nicht unterstützt.");
  context.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
  return scaledCanvas;
}

export async function createPdfBlobFromCanvas(canvas: HTMLCanvasElement, options: PdfCanvasOptions = {}) {
  const { jsPDF } = await preloadPdfExportModule();
  const pdfCanvas = scaleCanvasForPdf(canvas, options.maxDimensionPx);
  const orientation = options.orientation ?? (pdfCanvas.width > pdfCanvas.height ? "landscape" : "portrait");
  const pdf = new jsPDF({
    compress: true,
    format: [pdfCanvas.width, pdfCanvas.height],
    orientation,
    unit: "px",
  });
  pdf.addImage(pdfCanvas.toDataURL("image/png"), "PNG", 0, 0, pdfCanvas.width, pdfCanvas.height);
  return pdf.output("blob");
}

export function openExportTab() {
  const opened = window.open("about:blank", "_blank");
  if (!opened) throw new Error("Der neue Tab wurde vom Browser blockiert.");
  opened.opener = null;
  opened.document.title = "PDF wird vorbereitet";
  opened.document.body.style.fontFamily = "Arial, sans-serif";
  opened.document.body.style.margin = "24px";
  opened.document.body.textContent = "PDF wird vorbereitet...";
  return opened;
}

export function openExportBlob(blob: Blob, targetWindow?: Window | null) {
  const url = URL.createObjectURL(blob);
  if (targetWindow) {
    targetWindow.location.href = url;
  } else {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      URL.revokeObjectURL(url);
      throw new Error("Der neue Tab wurde vom Browser blockiert.");
    }
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
