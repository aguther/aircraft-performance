import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UsageNotice } from "../src/components/UsageNotice";

describe("UsageNotice", () => {
  it("renders the complete mandatory usage disclaimer", () => {
    const markup = renderToStaticMarkup(<UsageNotice open={false} onClose={() => undefined} />);

    expect(markup).toContain("Wichtiger Hinweis");
    expect(markup).toContain("Bitte lesen und bestätigen Sie vor der Nutzung");
    expect(markup).toContain("Keine Entscheidungsgrundlage");
    expect(markup).toContain("Teilweise inoffizielle Datenquellen");
    expect(markup).toContain("Verantwortung des Piloten");
    expect(markup).toContain("Verstanden – Weiter zur App");
    expect(markup).toContain("usage-notice-header");
    expect(markup).toContain("usage-notice-body");
    expect(markup).toContain("usage-notice-footer");
  });
});
