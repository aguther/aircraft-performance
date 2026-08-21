// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { appendPdfProvenance, insertPdfProvenance } from "../src/export/pdf";

function createCanvasHarness(width: number, height: number) {
  const source = document.createElement("canvas");
  const target = document.createElement("canvas");
  source.width = width;
  source.height = height;

  const context = {
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

  vi.spyOn(source, "getContext").mockReturnValue(context);
  vi.spyOn(target, "getContext").mockReturnValue(context);
  vi.spyOn(document, "createElement").mockReturnValue(target);

  return { context, source, target };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PDF provenance layout", () => {
  it("inserts the provenance block before the unchanged lower canvas section", () => {
    const { context, source, target } = createCanvasHarness(1516, 1863);
    const insertionY = 742;

    const result = insertPdfProvenance(source, {}, insertionY);
    const insertedHeight = target.height - source.height;

    expect(result).toBe(target);
    expect(target.width).toBe(source.width);
    expect(insertedHeight).toBeGreaterThan(0);
    expect(context.drawImage).toHaveBeenNthCalledWith(1, source, 0, 0, 1516, insertionY, 0, 0, 1516, insertionY);
    expect(context.drawImage).toHaveBeenNthCalledWith(2, source, 0, insertionY, 1516, 1121, 0, insertionY + insertedHeight, 1516, 1121);
    expect(context.fillRect).toHaveBeenCalledWith(0, insertionY, 1516, insertedHeight);
    expect(context.fillText).toHaveBeenCalledWith("Datenbasis", 48, insertionY + 36);
    expect(context.moveTo).toHaveBeenCalledWith(48, insertionY + insertedHeight - 1);
    expect(context.lineTo).toHaveBeenCalledWith(1468, insertionY + insertedHeight - 1);
  });

  it("keeps append mode and its leading separator for diagramless PDFs", () => {
    const { context, source, target } = createCanvasHarness(1200, 1324);

    appendPdfProvenance(source, {});

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage).toHaveBeenCalledWith(source, 0, 0);
    expect(context.moveTo).toHaveBeenCalledWith(48, source.height + 1);
    expect(context.lineTo).toHaveBeenCalledWith(1152, source.height + 1);
    expect(target.height).toBeGreaterThan(source.height);
  });

  it("grows the inserted block when provenance text wraps", () => {
    const wide = createCanvasHarness(1516, 1863);
    insertPdfProvenance(wide.source, {}, 742);
    const wideBlockHeight = wide.target.height - wide.source.height;
    vi.restoreAllMocks();

    const narrow = createCanvasHarness(400, 1863);
    insertPdfProvenance(narrow.source, {}, 742);
    const narrowBlockHeight = narrow.target.height - narrow.source.height;

    expect(narrow.target.width).toBe(narrow.source.width);
    expect(narrowBlockHeight).toBeGreaterThan(wideBlockHeight);
  });

  it("rejects insertion points outside the source canvas", () => {
    const { source } = createCanvasHarness(1516, 1863);

    expect(() => insertPdfProvenance(source, {}, -1)).toThrow(RangeError);
    expect(() => insertPdfProvenance(source, {}, 1864)).toThrow(RangeError);
  });
});
