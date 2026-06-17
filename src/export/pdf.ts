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

export async function createPdfBlobFromCanvas(canvas: HTMLCanvasElement) {
  const { jsPDF } = await preloadPdfExportModule();
  const pdf = new jsPDF({
    compress: true,
    format: [canvas.width, canvas.height],
    orientation: "portrait",
    unit: "px",
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
  return pdf.output("blob");
}
