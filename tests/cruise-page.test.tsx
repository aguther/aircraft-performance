import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CruisePage } from "../src/pages/CruisePage";

describe("CruisePage", () => {
  it("renders the default result and both POH charts", () => {
    const markup = renderToStaticMarkup(<CruisePage />);

    expect(markup).toContain("Wahre Fluggeschwindigkeit · POH 5.3.12");
    expect(markup).toContain("grob115b-cruise-speed-chart.png");
    expect(markup).toContain("grob115b-cruise-rpm-chart.png");
    expect(markup).toContain("Density Altitude");
  });
});
