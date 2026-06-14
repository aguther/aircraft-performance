import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculatorRegistry } from "../src/app/calculators";
import { StallPage } from "../src/pages/StallPage";

describe("StallPage", () => {
  it("renders the default stall result and POH chart", () => {
    const markup = renderToStaticMarkup(<StallPage />);

    expect(markup).toContain("Überziehgeschwindigkeit");
    expect(markup).toContain("grob115b-stall-chart.png");
    expect(markup).toContain("Leerlauf");
    expect(markup).toContain("Klappen 40°");
  });

  it("is registered as a React calculator", () => {
    expect(
      calculatorRegistry.find((calculator) => calculator.capability === "stall")?.runtime,
    ).toBe("react");
  });
});
