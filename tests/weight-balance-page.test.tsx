import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeightBalancePage } from "../src/pages/WeightBalancePage";

describe("WeightBalancePage", () => {
  it("renders the default G115B calculation from the TypeScript domain layer", () => {
    const markup = renderToStaticMarkup(<WeightBalancePage />);

    expect(markup).toContain("Weight &amp; Balance");
    expect(markup).toContain("D-EBFT");
    expect(markup).toContain("830.6");
    expect(markup).toContain("235.18");
    expect(markup).toContain("Innerhalb Envelope");
    expect(markup).toContain("Weight and balance envelope");
  });
});
