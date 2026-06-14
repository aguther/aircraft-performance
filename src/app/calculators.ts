import type { AircraftCapability } from "./aircraft";

export type CalculatorDefinition = {
  capability: AircraftCapability;
  href: string;
  icon: string;
  tag: string;
  title: string;
  description: string;
  source: string;
  group: "planning" | "reference";
  runtime: "react" | "legacy";
};

export const calculatorRegistry: CalculatorDefinition[] = [
  {
    capability: "weightBalance",
    href: "/weight_balance.html",
    icon: "WB",
    tag: "Beladung",
    title: "Weight & Balance",
    description: "Schwerpunktlage, Moment und relevante IAS nach Beladung.",
    source: "POH 6.4 und Wägeberichte",
    group: "planning",
    runtime: "react",
  },
  {
    capability: "takeoff",
    href: "/takeoff.html",
    icon: "TO",
    tag: "Startstrecke",
    title: "Take-Off",
    description: "Startrollstrecke und Startstrecke über Hindernis.",
    source: "POH 5.3.7",
    group: "planning",
    runtime: "react",
  },
  {
    capability: "climb",
    href: "/climb.html",
    icon: "CLB",
    tag: "Steigflug",
    title: "Climb",
    description: "Zeit, Kraftstoff und Distanz zwischen zwei Höhen.",
    source: "POH 5.3.9",
    group: "planning",
    runtime: "legacy",
  },
  {
    capability: "cruise",
    href: "/cruise.html",
    icon: "CR",
    tag: "Reiseflug",
    title: "Cruise",
    description: "Drehzahl, Kraftstoffverbrauch und TAS.",
    source: "POH 5.3.10, 5.3.11, 5.3.12",
    group: "planning",
    runtime: "react",
  },
  {
    capability: "landing",
    href: "/landing.html",
    icon: "LDG",
    tag: "Landestrecke",
    title: "Landing",
    description: "Landerollstrecke und Landestrecke über Hindernis.",
    source: "POH 5.3.15",
    group: "planning",
    runtime: "react",
  },
  {
    capability: "stall",
    href: "/stall.html",
    icon: "VS",
    tag: "Überziehgeschwindigkeit",
    title: "Stall",
    description: "VS0 und VS1 nach Masse, Klappen und Leistung.",
    source: "POH 5.3.4",
    group: "reference",
    runtime: "legacy",
  },
  {
    capability: "climbRate",
    href: "/climb_rate.html",
    icon: "VY",
    tag: "Steigleistung",
    title: "Climb Rate",
    description: "Rate of Climb und VY nach Masse und Dichtehöhe.",
    source: "POH 5.3.8",
    group: "reference",
    runtime: "legacy",
  },
];
