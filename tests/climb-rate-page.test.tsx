import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculatorRegistry } from "../src/app/calculators";
import { ClimbRatePage } from "../src/pages/ClimbRatePage";

describe("ClimbRatePage", () => {
  it("renders the default rate of climb and climb speed", () => {
    const markup = renderToStaticMarkup(<ClimbRatePage />);

    expect(markup).toContain("Steigrate · Rate of Climb");
    expect(markup).toContain("Climb Speed");
    expect(markup).toContain("Density Altitude");
    expect(markup).toContain("Bedingungen");
  });

  it("is registered as a React calculator", () => {
    expect(
      calculatorRegistry.find((calculator) => calculator.capability === "climbRate")?.runtime,
    ).toBe("react");
  });
});
