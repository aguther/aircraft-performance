import { describe, expect, it } from "vitest";
import { formatPdfUtc, pdfProvenanceLines, PILOT_RESPONSIBILITY_NOTICE } from "../src/export/pdf";
import type { Airport, WeatherForecast } from "../src/flight-data";

const airport: Airport = {
  id: "synthetic-airport",
  name: "Testflugplatz",
  icaoCode: "EDZZ",
  country: "DE",
  coordinates: { latitude: 50, longitude: 8 },
  elevationFt: 400,
  magneticDeclinationDeg: 3,
  runways: [],
  source: {
    provider: "OpenAIP",
    updatedAt: "2026-08-18T12:00:00.000Z",
    retrievedAt: "2026-08-18T14:05:00.000Z",
  },
};

const iconForecast: WeatherForecast = {
  id: "icon-d2-2026-08-18T15:00Z",
  validAt: "2026-08-18T15:00:00.000Z",
  temperatureC: 20,
  qnhHpa: 1016,
  windDirectionTrueDeg: 90,
  windSpeedKt: 8,
  source: {
    provider: "Open-Meteo",
    model: "ICON-D2",
    retrievedAt: "2026-08-18T14:06:00.000Z",
  },
};

describe("PDF data provenance", () => {
  it("keeps the full pilot responsibility notice", () => {
    expect(PILOT_RESPONSIBILITY_NOTICE).toBe("Daten ohne Gewähr. Der verantwortliche Pilot ist verpflichtet, sämtliche verwendeten Flugplatz-, Bahn- und Wetterdaten anhand der offiziellen Quellen nachzuprüfen. Die volle Verantwortung für Datenprüfung, Flugvorbereitung und Flugdurchführung verbleibt beim Piloten.");
  });

  it("formats all timestamps explicitly in UTC", () => {
    expect(formatPdfUtc("2026-08-18T14:05:00.000Z")).toBe("18.08.2026 14:05 UTC");
    expect(formatPdfUtc("invalid")).toBe("unbekannt");
  });

  it("lists OpenAIP source state, retrieval time, forecast time, model and missing run time", () => {
    expect(pdfProvenanceLines({ airport, weather: iconForecast })).toEqual([
      "Flugplatz/Bahn: OpenAIP · Datenstand 18.08.2026 12:00 UTC · Abruf 18.08.2026 14:05 UTC.",
      "Wetter: Open-Meteo · ICON-D2 · verwendet für 18.08.2026 15:00 UTC · Modelllauf vom Anbieter nicht übermittelt · Abruf 18.08.2026 14:06 UTC.",
    ]);
  });

  it("falls back to retrieval time and identifies manual inputs", () => {
    const airportWithoutSourceState: Airport = {
      ...airport,
      source: { provider: "OpenAIP", retrievedAt: "2026-08-18T14:05:00.000Z" },
    };
    expect(pdfProvenanceLines({ airport: airportWithoutSourceState })).toEqual([
      "Flugplatz/Bahn: OpenAIP · Abruf 18.08.2026 14:05 UTC.",
      "Wetterwerte: manuelle Eingabe; keine Online-Wetterquelle übernommen.",
    ]);
    expect(pdfProvenanceLines({})).toEqual([
      "Flugplatz-/Bahndaten: keine Online-Daten übernommen.",
      "Wetterwerte: manuelle Eingabe; keine Online-Wetterquelle übernommen.",
    ]);
  });

  it("separates a TAF wind source from its METAR QNH/OAT basis", () => {
    const tafForecast: WeatherForecast = {
      ...iconForecast,
      validAt: "2026-08-18T15:00:00.000Z",
      source: {
        provider: "Aviation Weather Center",
        model: "TAF · METAR",
        updatedAt: "2026-08-18T13:00:00.000Z",
        retrievedAt: "2026-08-18T14:06:00.000Z",
      },
      baseForecast: {
        validAt: "2026-08-18T13:50:00.000Z",
        source: {
          provider: "Aviation Weather Center",
          model: "METAR",
          updatedAt: "2026-08-18T13:50:00.000Z",
          retrievedAt: "2026-08-18T14:06:00.000Z",
        },
      },
    };

    expect(pdfProvenanceLines({ airport, weather: tafForecast })).toEqual([
      "Flugplatz/Bahn: OpenAIP · Datenstand 18.08.2026 12:00 UTC · Abruf 18.08.2026 14:05 UTC.",
      "Wetter (Wind): Aviation Weather Center · TAF · gültig ab 18.08.2026 15:00 UTC · Ausgabe 18.08.2026 13:00 UTC · Abruf 18.08.2026 14:06 UTC.",
      "Wetter (QNH/OAT): Aviation Weather Center · METAR · Beobachtung 18.08.2026 13:50 UTC · Abruf 18.08.2026 14:06 UTC.",
    ]);
  });
});
