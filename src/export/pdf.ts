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
