import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfMocks = vi.hoisted(() => ({
  addImage: vi.fn(),
  addPage: vi.fn(),
  constructor: vi.fn(),
  output: vi.fn(() => new Blob()),
}));

vi.mock("jspdf", () => ({ jsPDF: pdfMocks.constructor }));

import { createA4LandscapePdfBlobFromCanvases } from "../src/export/pdf";

beforeEach(() => {
  vi.clearAllMocks();
  pdfMocks.constructor.mockImplementation(function PdfMock() {
    return {
      addImage: pdfMocks.addImage,
      addPage: pdfMocks.addPage,
      internal: {
        pageSize: {
          getHeight: () => 210,
          getWidth: () => 297,
        },
      },
      output: pdfMocks.output,
    };
  });
});

describe("A4 landscape PDF pages", () => {
  it("creates one A4 landscape PDF page per canvas and scales each without cropping", async () => {
    const summaryPage = { height: 950, toDataURL: vi.fn(() => "summary"), width: 1516 } as unknown as HTMLCanvasElement;
    const diagramPage = { height: 1201, toDataURL: vi.fn(() => "diagram"), width: 1516 } as unknown as HTMLCanvasElement;

    const result = await createA4LandscapePdfBlobFromCanvases([summaryPage, diagramPage]);

    expect(result).toBeInstanceOf(Blob);
    expect(pdfMocks.constructor).toHaveBeenCalledWith({
      compress: true,
      format: "a4",
      orientation: "landscape",
      unit: "mm",
    });
    expect(pdfMocks.addPage).toHaveBeenCalledOnce();
    expect(pdfMocks.addPage).toHaveBeenCalledWith("a4", "landscape");
    expect(pdfMocks.addImage).toHaveBeenCalledTimes(2);
    expect(pdfMocks.addImage.mock.calls[0][0]).toBe("summary");
    expect(pdfMocks.addImage.mock.calls[0][2]).toBeCloseTo(0);
    expect(pdfMocks.addImage.mock.calls[0][3]).toBe(0);
    expect(pdfMocks.addImage.mock.calls[0][4]).toBeCloseTo(297);
    expect(pdfMocks.addImage.mock.calls[0][5]).toBeLessThanOrEqual(210);
    expect(pdfMocks.addImage.mock.calls[1][0]).toBe("diagram");
    expect(pdfMocks.addImage.mock.calls[1][2]).toBeGreaterThan(0);
    expect(pdfMocks.addImage.mock.calls[1][3]).toBe(0);
    expect(pdfMocks.addImage.mock.calls[1][4]).toBeLessThan(297);
    expect(pdfMocks.addImage.mock.calls[1][5]).toBeCloseTo(210);
    expect(pdfMocks.output).toHaveBeenCalledWith("blob");
  });

  it("requires at least one page canvas", async () => {
    await expect(createA4LandscapePdfBlobFromCanvases([])).rejects.toThrow("Mindestens eine PDF-Seite ist erforderlich.");
    expect(pdfMocks.constructor).not.toHaveBeenCalled();
  });
});
