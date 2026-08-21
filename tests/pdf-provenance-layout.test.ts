// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { appendPdfProvenance, createPdfProvenancePages } from "../src/export/pdf";

function createContext() {
  return {
    beginPath: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "",
    font: "",
    lineWidth: 1,
    strokeStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

function createCanvasHarness(width: number, height: number, targetCount: number) {
  const source = document.createElement("canvas");
  const targets = Array.from({ length: targetCount }, () => document.createElement("canvas"));
  const sourceContext = createContext();
  const contexts = targets.map(() => createContext());
  source.width = width;
  source.height = height;

  vi.spyOn(source, "getContext").mockReturnValue(sourceContext);
  targets.forEach((target, index) => vi.spyOn(target, "getContext").mockReturnValue(contexts[index]));
  const createElement = vi.spyOn(document, "createElement");
  targets.forEach((target) => createElement.mockReturnValueOnce(target));

  return { contexts, source, targets };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PDF provenance layout", () => {
  it("places summary and provenance on page one and pads the unchanged diagram section on page two", () => {
    const { contexts, source, targets } = createCanvasHarness(1516, 1863, 2);
    const [summaryPage, diagramPage] = targets;
    const [summaryContext, diagramContext] = contexts;
    const splitY = 742;

    const result = createPdfProvenancePages(source, {}, splitY);
    const provenanceHeight = summaryPage.height - splitY;

    expect(result).toEqual([summaryPage, diagramPage]);
    expect(summaryPage.width).toBe(source.width);
    expect(provenanceHeight).toBeGreaterThan(0);
    expect(summaryContext.drawImage).toHaveBeenCalledWith(source, 0, 0, 1516, splitY, 0, 0, 1516, splitY);
    expect(summaryContext.fillRect).toHaveBeenCalledWith(0, splitY, 1516, provenanceHeight);
    expect(summaryContext.fillText).toHaveBeenCalledWith("Datenbasis", 48, splitY + 36);
    expect(summaryContext.stroke).not.toHaveBeenCalled();
    expect(diagramPage.width).toBe(source.width);
    expect(diagramPage.height).toBe(1201);
    expect(diagramContext.fillRect).toHaveBeenCalledWith(0, 0, 1516, 1201);
    expect(diagramContext.drawImage).toHaveBeenCalledWith(source, 0, splitY, 1516, 1121, 0, 48, 1516, 1121);
  });

  it("keeps append mode and its leading separator for diagramless PDFs", () => {
    const { contexts, source, targets } = createCanvasHarness(1200, 1324, 1);
    const [context] = contexts;
    const [target] = targets;

    appendPdfProvenance(source, {});

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage).toHaveBeenCalledWith(source, 0, 0);
    expect(context.moveTo).toHaveBeenCalledWith(48, source.height + 1);
    expect(context.lineTo).toHaveBeenCalledWith(1152, source.height + 1);
    expect(target.height).toBeGreaterThan(source.height);
  });

  it("grows only the summary page when provenance text wraps", () => {
    const wide = createCanvasHarness(1516, 1863, 2);
    createPdfProvenancePages(wide.source, {}, 742);
    const wideSummaryHeight = wide.targets[0].height;
    const wideDiagramHeight = wide.targets[1].height;
    vi.restoreAllMocks();

    const narrow = createCanvasHarness(400, 1863, 2);
    createPdfProvenancePages(narrow.source, {}, 742);

    expect(narrow.targets[0].width).toBe(narrow.source.width);
    expect(narrow.targets[0].height).toBeGreaterThan(wideSummaryHeight);
    expect(narrow.targets[1].height).toBe(wideDiagramHeight);
  });

  it("rejects split points outside the source canvas", () => {
    const { source } = createCanvasHarness(1516, 1863, 2);

    expect(() => createPdfProvenancePages(source, {}, 0)).toThrow(RangeError);
    expect(() => createPdfProvenancePages(source, {}, 1863)).toThrow(RangeError);
  });
});
