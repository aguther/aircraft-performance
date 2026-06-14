// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AircraftProvider, useAircraft } from "../src/app/AircraftContext";
import type { AircraftDefinition } from "../src/app/aircraft";
import { FlightPlanProvider, useFlightPlan } from "../src/app/FlightPlanContext";
import { AltitudeInput, type AltitudeInputValue } from "../src/components/AltitudeInput";
import { ClimbPage } from "../src/pages/ClimbPage";
import { StallPage } from "../src/pages/StallPage";
import { WeightBalancePage } from "../src/pages/WeightBalancePage";
import { TakeoffPage } from "../src/pages/TakeoffPage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

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

const testAircraft: AircraftDefinition[] = [
  {
    id: "first",
    manufacturer: "Test",
    model: "One",
    shortName: "Test One",
    registrations: [],
    capabilities: ["weightBalance"],
  },
  {
    id: "second",
    manufacturer: "Test",
    model: "Two",
    shortName: "Test Two",
    registrations: [],
    capabilities: ["takeoff"],
  },
];

function AircraftContextHarness() {
  const { aircraft, availableAircraft, selectAircraft } = useAircraft();
  return (
    <>
      <span>{aircraft.shortName}</span>
      <button type="button" onClick={() => selectAircraft(availableAircraft[1].id)}>Nächstes Flugzeug</button>
    </>
  );
}

function FlightPlanContextHarness() {
  const { flightPlan, updateWeightBalance, publishMasses } = useFlightPlan();
  return (
    <>
      <span>{flightPlan.weightBalance.pilotMassKg} kg</span>
      <span>{flightPlan.masses?.startMassKg ?? "Keine Masse"}</span>
      <button type="button" onClick={() => updateWeightBalance({ pilotMassKg: 90 })}>Pilot ändern</button>
      <button type="button" onClick={() => publishMasses({ startMassKg: 850, landingMassKg: 820, startFuelLiters: 60, landingFuelLiters: 18 })}>Massen veröffentlichen</button>
    </>
  );
}

describe("calculator interactions", () => {
  it("selects and persists the central aircraft", async () => {
    const user = userEvent.setup();
    render(<AircraftProvider availableAircraft={testAircraft}><AircraftContextHarness /></AircraftProvider>);

    await user.click(screen.getByRole("button", { name: "Nächstes Flugzeug" }));

    expect(screen.getByText("Test Two")).toBeTruthy();
    expect(window.localStorage.getItem("performance-calculators-aircraft")).toBe("second");
  });

  it("stores the central flight plan and published masses", async () => {
    const user = userEvent.setup();
    render(<FlightPlanProvider><FlightPlanContextHarness /></FlightPlanProvider>);

    await user.click(screen.getByRole("button", { name: "Pilot ändern" }));
    await user.click(screen.getByRole("button", { name: "Massen veröffentlichen" }));

    expect(screen.getByText("90 kg")).toBeTruthy();
    expect(screen.getByText("850")).toBeTruthy();
    expect(window.localStorage.getItem("performance-calculators-flight-plan")).toContain('"landingMassKg":820');
  });

  it("publishes a lower landing mass after planned fuel burn", async () => {
    render(<FlightPlanProvider><WeightBalancePage /></FlightPlanProvider>);
    const burnField = screen.getByText("Geplanter Verbrauch", { selector: ".field-label" }).parentElement!;
    const burnInput = burnField.querySelector('input[type="number"]')!;

    fireEvent.change(burnInput, { target: { value: "30" } });

    await waitFor(() => {
      const storedPlan = JSON.parse(window.localStorage.getItem("performance-calculators-flight-plan")!);
      expect(storedPlan.masses.startMassKg).toBeGreaterThan(storedPlan.masses.landingMassKg);
      expect(storedPlan.masses.landingFuelLiters).toBe(77);
    });
  });

  it("imports the planned takeoff mass without writing local changes back", async () => {
    window.localStorage.setItem("performance-calculators-flight-plan", JSON.stringify({
      weightBalance: {
        registration: "D-EBFT",
        pilotMassKg: 85,
        copilotMassKg: 0,
        baggageMassKg: 0,
        startFuelLiters: 60,
        plannedFuelBurnLiters: 30,
      },
      masses: {
        startMassKg: 850.3,
        landingMassKg: 828.4,
        startFuelLiters: 60,
        landingFuelLiters: 30,
        updatedAt: "2026-06-14T12:00:00.000Z",
      },
    }));
    const user = userEvent.setup();
    render(<MemoryRouter><FlightPlanProvider><TakeoffPage /></FlightPlanProvider></MemoryRouter>);

    expect(screen.getByText("850.3 kg")).toBeTruthy();
    expect(screen.getByText(/Übernahme konservativ als 851 kg/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Masse übernehmen" }));
    const massField = screen.getByText("Masse", { selector: ".field-label" }).parentElement!;
    const massInput = massField.querySelector('input[type="number"]')!;
    expect(massInput.getAttribute("value")).toBe("851");

    fireEvent.change(massInput, { target: { value: "840" } });

    await waitFor(() => {
      const storedPlan = JSON.parse(window.localStorage.getItem("performance-calculators-flight-plan")!);
      expect(storedPlan.masses.startMassKg).toBe(850.3);
    });
  });

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
