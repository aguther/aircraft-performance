import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculatorRegistry } from "../src/app/calculators";
import { TakeoffPage } from "../src/pages/TakeoffPage";

describe("TakeoffPage", () => {
  it("renders the default calculation and chart as React markup", () => {
    const markup = renderToStaticMarkup(<TakeoffPage />);

    expect(markup).toContain("Ground Roll · Startrollstrecke");
    expect(markup).toContain("Takeoff Distance · Startstrecke über 15 m");
    expect(markup).toContain("Grafische Nachvollziehbarkeit");
    expect(markup).toContain("grob115b-takeoff-chart.png");
    expect(markup).toContain("Rechenweg");
  });

  it("is registered as a React calculator", () => {
    expect(
      calculatorRegistry.find((calculator) => calculator.capability === "takeoff")?.runtime,
    ).toBe("react");
  });
});
