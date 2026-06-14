import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { FlightPlanProvider } from "../src/app/FlightPlanContext";
import { TakeoffPage } from "../src/pages/TakeoffPage";

describe("TakeoffPage", () => {
  it("renders the default calculation and chart as React markup", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><FlightPlanProvider><TakeoffPage /></FlightPlanProvider></MemoryRouter>);

    expect(markup).toContain("Ground Roll · Startrollstrecke");
    expect(markup).toContain("Takeoff Distance · Startstrecke über 15 m");
    expect(markup).toContain("Grafische Nachvollziehbarkeit");
    expect(markup).toContain("grob115b-takeoff-chart.png");
    expect(markup).toContain("Rechenweg");
    expect(markup).toContain("0.0 %");
    expect(markup).toContain('step="1" value="920"');
  });
});
