// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AircraftProvider, useAircraft } from "../src/app/AircraftContext";
import type { AircraftDefinition } from "../src/app/aircraft";
import { FlightPlanProvider, useFlightPlan } from "../src/app/FlightPlanContext";
import { AltitudeInput, type AltitudeInputValue } from "../src/components/AltitudeInput";
import { utcDateTimeIso, utcDateTimeValue, weatherValuesForRunway } from "../src/components/AirportRunwayInput";
import type { Airport } from "../src/flight-data";
import { ClimbPage } from "../src/pages/ClimbPage";
import { StallPage } from "../src/pages/StallPage";
import { WeightBalancePage } from "../src/pages/WeightBalancePage";
import { TakeoffPage } from "../src/pages/TakeoffPage";
import { LandingPage } from "../src/pages/LandingPage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
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
  it("stores planned airport times explicitly as UTC", () => {
    expect(utcDateTimeValue("2026-06-14T18:30:00.000Z")).toBe("2026-06-14T18:30");
    expect(utcDateTimeIso("2026-06-14T18:30")).toBe("2026-06-14T18:30:00.000Z");
  });

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
    const view = render(<MemoryRouter><FlightPlanProvider><TakeoffPage /></FlightPlanProvider></MemoryRouter>);

    expect(screen.getByText("850.3 kg")).toBeTruthy();
    expect(screen.getByText(/Übernahme konservativ als 851 kg/)).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Masse übernehmen" }));
    const massField = screen.getByText("Masse", { selector: ".field-label" }).parentElement!;
    const massInput = massField.querySelector('input[type="number"]')!;
    expect(massInput.getAttribute("value")).toBe("851");
    expect(massInput.hasAttribute("disabled")).toBe(true);

    await waitFor(() => {
      const storedPlan = JSON.parse(window.localStorage.getItem("performance-calculators-flight-plan")!);
      expect(storedPlan.imports.takeoffMass).toBe(true);
    });
    view.unmount();
    render(<MemoryRouter><FlightPlanProvider><TakeoffPage /></FlightPlanProvider></MemoryRouter>);
    expect(screen.getByRole("checkbox", { name: "Masse übernommen" }).hasAttribute("checked")).toBe(true);
    const restoredMassField = screen.getByText("Masse", { selector: ".field-label" }).parentElement!;
    const restoredMassInput = restoredMassField.querySelector('input[type="number"]')!;
    await waitFor(() => expect(restoredMassInput.getAttribute("value")).toBe("851"));
    expect(restoredMassInput.hasAttribute("disabled")).toBe(true);

    await user.click(screen.getByRole("checkbox", { name: "Masse übernommen" }));
    expect(restoredMassInput.hasAttribute("disabled")).toBe(false);
    fireEvent.change(restoredMassInput, { target: { value: "840" } });

    await waitFor(() => {
      const storedPlan = JSON.parse(window.localStorage.getItem("performance-calculators-flight-plan")!);
      expect(storedPlan.masses.startMassKg).toBe(850.3);
      expect(storedPlan.imports.takeoffMass).toBe(false);
    });
  });

  it("keeps the supported decimal precision in slope input", () => {
    render(<MemoryRouter><FlightPlanProvider><TakeoffPage /></FlightPlanProvider></MemoryRouter>);
    const runwaySection = screen.getByText("Pistenbedingungen", { selector: ".section-header" }).parentElement!;
    const slopeField = within(runwaySection).getByText("Slope", { selector: ".field-label" }).parentElement!;
    const slopeInput = slopeField.querySelector('input[inputmode="decimal"]')!;

    expect(slopeInput.getAttribute("value")).toBe("0.0");
    fireEvent.change(slopeInput, { target: { value: "1" } });
    fireEvent.blur(slopeInput);
    expect(slopeInput.getAttribute("value")).toBe("1.0");
  });

  const airport: Airport = {
    id: "open-aip-edfe",
    name: "Frankfurt-Egelsbach",
    icaoCode: "EDFE",
    country: "DE",
    coordinates: { latitude: 49.9608, longitude: 8.6436 },
    elevationFt: 384,
    magneticDeclinationDeg: 3.5,
    runways: [{
      id: "edfe-08",
      designator: "08",
      trueHeadingDeg: 82,
      magneticHeadingDeg: 78.5,
      lengthM: 1400,
      widthM: 25,
      surface: "asphalt",
    }],
    source: { provider: "OpenAIP", updatedAt: "2026-06-14T12:00:00.000Z" },
  };
  const weather = {
    id: "icon-d2-2026-06-14T19:00Z",
    airportId: airport.id,
    validAt: "2026-06-14T19:00Z",
    temperatureC: 16.5,
    qnhHpa: 1015.9,
    windDirectionTrueDeg: 82,
    windSpeedKt: 7.8,
    windGustKt: 12.4,
    source: { provider: "Open-Meteo" as const, model: "ICON-D2", updatedAt: "2026-06-14T18:45:00.000Z" },
  };

  function stubAirportSearch() {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/weather?")) return Response.json(weather);
      return Response.json(url.includes("/api/airports?") ? { items: [airport], totalCount: 1 } : airport);
    }));
  }

  it("maps ICON-D2 weather to supported calculator values", () => {
    expect(weatherValuesForRunway(weather, airport.runways[0])).toEqual({
      qnhHpa: 1016,
      oatC: 17,
      windKt: 7,
    });
  });

  it("applies real OpenAIP airport and runway data to takeoff", async () => {
    stubAirportSearch();
    const user = userEvent.setup();
    render(<MemoryRouter><FlightPlanProvider><TakeoffPage /></FlightPlanProvider></MemoryRouter>);

    await user.type(screen.getByRole("searchbox", { name: "Flugplatzsuche" }), "EDFE");
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    expect(await screen.findByText(/OpenAIP · Stand/)).toBeTruthy();
    expect(await screen.findByText(/ICON-D2-Prognose/)).toBeTruthy();
    expect(screen.getByText("HW")).toBeTruthy();
    expect(screen.getByText("XW")).toBeTruthy();
    expect(screen.getByText("TORA")).toBeTruthy();
    expect(screen.getByText("TODA")).toBeTruthy();
    expect(screen.getByText("Geplante Startzeit · UTC · 24 h")).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Werte übernehmen" }));
    expect(screen.getByRole("button", { name: "Elevation" }).hasAttribute("disabled")).toBe(true);
    const atmosphereSection = screen.getByText("Atmosphäre", { selector: ".section-header" }).parentElement!;
    const qnhField = within(atmosphereSection).getByText("QNH", { selector: ".field-label" }).parentElement!;
    expect(qnhField.querySelector('input[type="number"]')?.hasAttribute("disabled")).toBe(true);
    const runwaySection = screen.getByText("Pistenbedingungen", { selector: ".section-header" }).parentElement!;
    const windField = within(runwaySection).getByText("Wind", { selector: ".field-label" }).parentElement!;
    expect(windField.querySelector('input[type="number"]')?.hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: "Werte übernommen" }));
    expect(screen.getByRole("button", { name: "Elevation" }).hasAttribute("disabled")).toBe(false);
    expect(qnhField.querySelector('input[type="number"]')?.hasAttribute("disabled")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Elevation" }));

    expect(within(atmosphereSection).getByDisplayValue("384")).toBeTruthy();
    await waitFor(() => {
      const storedPlan = JSON.parse(window.localStorage.getItem("performance-calculators-flight-plan")!);
      expect(storedPlan.departure.airportId).toBe("open-aip-edfe");
      expect(storedPlan.departure.runwayId).toBe("edfe-08");
      expect(storedPlan.imports.departureImport).toBe(false);
      expect(storedPlan.departure.plannedAt).toMatch(/Z$/);
    });
  });

  it("applies real OpenAIP destination airport data to landing", async () => {
    stubAirportSearch();
    const user = userEvent.setup();
    render(<MemoryRouter><FlightPlanProvider><LandingPage /></FlightPlanProvider></MemoryRouter>);

    await user.type(screen.getByRole("searchbox", { name: "Flugplatzsuche" }), "EDFE");
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    expect(await screen.findByText("Landebahn")).toBeTruthy();
    expect(screen.getByText("Geplante Landezeit · UTC · 24 h")).toBeTruthy();
    const plannedTime = screen.getByText("Geplante Landezeit · UTC · 24 h").parentElement!.querySelector("input")!;
    expect(plannedTime.hasAttribute("disabled")).toBe(false);
    await user.click(screen.getByRole("checkbox", { name: "Jetzt" }));
    expect(plannedTime.hasAttribute("disabled")).toBe(true);
    await waitFor(() => {
      const storedPlan = JSON.parse(window.localStorage.getItem("performance-calculators-flight-plan")!);
      expect(storedPlan.imports.arrivalWeatherNow).toBe(true);
    });
    await user.click(screen.getByRole("checkbox", { name: "Werte übernehmen" }));
    await user.click(screen.getByRole("checkbox", { name: "Werte übernommen" }));
    await user.click(screen.getByRole("button", { name: "Elevation" }));

    const atmosphereSection = screen.getByText("Atmosphäre", { selector: ".section-header" }).parentElement!;
    expect(within(atmosphereSection).getByDisplayValue("384")).toBeTruthy();
    await waitFor(() => {
      const storedPlan = JSON.parse(window.localStorage.getItem("performance-calculators-flight-plan")!);
      expect(storedPlan.arrival.airportId).toBe("open-aip-edfe");
      expect(storedPlan.arrival.runwayId).toBe("edfe-08");
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
