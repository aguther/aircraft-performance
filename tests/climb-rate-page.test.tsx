import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClimbRatePage } from "../src/pages/ClimbRatePage";

describe("ClimbRatePage", () => {
  it("renders the default rate of climb and climb speed", () => {
    const markup = renderToStaticMarkup(<ClimbRatePage />);

    expect(markup).toContain("Steigrate · Rate of Climb");
    expect(markup).toContain("Climb Speed");
    expect(markup).toContain("Density Altitude");
    expect(markup).toContain("Bedingungen");
  });
});
