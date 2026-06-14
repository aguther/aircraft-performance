import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculatorRegistry } from "../src/app/calculators";
import { LandingPage } from "../src/pages/LandingPage";

describe("LandingPage", () => {
  it("renders the default calculation and chart as React markup", () => {
    const markup = renderToStaticMarkup(<LandingPage />);

    expect(markup).toContain("Landing Roll · Landerollstrecke");
    expect(markup).toContain("Landing Distance · Landestrecke über 15 m");
    expect(markup).toContain("grob115b-landing-chart.png");
    expect(markup).toContain("Anfluggeschwindigkeiten");
  });

  it("is registered as a React calculator", () => {
    expect(
      calculatorRegistry.find((calculator) => calculator.capability === "landing")?.runtime,
    ).toBe("react");
  });
});
