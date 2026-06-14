import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FlightPlanProvider } from "../src/app/FlightPlanContext";
import { WeightBalancePage } from "../src/pages/WeightBalancePage";

describe("WeightBalancePage", () => {
  it("renders the default G115B calculation from the TypeScript domain layer", () => {
    const markup = renderToStaticMarkup(<FlightPlanProvider><WeightBalancePage /></FlightPlanProvider>);

    expect(markup).toContain("Flugplanung");
    expect(markup).toContain("Startmasse");
    expect(markup).toContain("Landemasse");
    expect(markup).toContain("D-EBFT");
    expect(markup).toContain("830.6");
    expect(markup).toContain("235.18");
    expect(markup).toContain("zentral gespeichert");
    expect(markup).toContain("Weight and balance envelope");
  });
});
