// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AltitudeInput, type AltitudeInputValue } from "../src/components/AltitudeInput";
import { ClimbPage } from "../src/pages/ClimbPage";
import { StallPage } from "../src/pages/StallPage";

afterEach(cleanup);

function AltitudeInputHarness() {
  const [value, setValue] = useState<AltitudeInputValue>({
    mode: "alt",
    altitudeFt: 4500,
    flightLevel: 45,
    densityAltitudeFt: 4500,
    oatC: 6,
    qnhHpa: 1013,
  });

  return <AltitudeInput value={value} onChange={setValue} />;
}

describe("calculator interactions", () => {
  it("switches the common altitude input to direct density altitude", async () => {
    const user = userEvent.setup();
    render(<AltitudeInputHarness />);

    expect(screen.getByText("Density Altitude", { selector: ".derived-label" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Density Alt." }));

    expect(screen.queryByText("OAT", { selector: ".field-label" })).toBeNull();
    expect(screen.queryByText("Density Altitude", { selector: ".derived-label" })).toBeNull();
    expect(screen.getByDisplayValue("4500")).toBeTruthy();
  });

  it("shows an error when the climb destination is below the departure", async () => {
    const user = userEvent.setup();
    render(<ClimbPage />);
    const destinationSection = screen.getByText("Ziel", { selector: ".section-header" }).parentElement!;

    await user.click(within(destinationSection).getByRole("button", { name: "Density Alt." }));
    const destinationAltitude = within(destinationSection).getByDisplayValue("4500");
    fireEvent.change(destinationAltitude, { target: { value: "-100" } });

    expect(screen.getByText("Ergebnis - Eingabe prüfen")).toBeTruthy();
    expect(screen.getByText("Ziel-Dichtehöhe muss größer als Start-Dichtehöhe sein.")).toBeTruthy();
  });

  it("updates the stall result when power and flap settings change", async () => {
    const user = userEvent.setup();
    render(<StallPage />);

    await user.click(screen.getByRole("button", { name: "Vollast" }));
    await user.click(screen.getByRole("button", { name: "0°" }));

    expect(screen.getByText("Ergebnis - 920 kg · Vollast · Klappen 0°")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vollast" }).classList.contains("active")).toBe(true);
    expect(screen.getByRole("button", { name: "0°" }).classList.contains("active")).toBe(true);
    expect(screen.getByText("Vollast · Klappen 0°")).toBeTruthy();
  });
});
