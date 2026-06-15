import type { AircraftCapability } from "./aircraft";

export type CalculatorDefinition = {
  capability: AircraftCapability;
  href: string;
  icon: string;
  navTitle: string;
  tag: string;
  title: string;
  description: string;
  source: string;
  group: "planning" | "reference";
};

export const calculatorRegistry: CalculatorDefinition[] = [
  {
    capability: "weightBalance",
    href: "/weight_balance.html",
    icon: "WB",
    navTitle: "W&B",
    tag: "Beladung",
    title: "Weight & Balance",
    description: "Schwerpunktlage, Moment und relevante IAS nach Beladung.",
    source: "POH 6.4 und Wägeberichte",
    group: "planning",
  },
  {
    capability: "takeoff",
    href: "/takeoff.html",
    icon: "TO",
    navTitle: "Takeoff",
    tag: "Startstrecke",
    title: "Take-Off",
    description: "Startrollstrecke und Startstrecke über Hindernis.",
    source: "POH 5.3.7",
    group: "planning",
  },
  {
    capability: "climb",
    href: "/climb.html",
    icon: "CLB",
    navTitle: "Climb",
    tag: "Steigflug",
    title: "Climb",
    description: "Zeit, Kraftstoff und Distanz zwischen zwei Höhen.",
    source: "POH 5.3.9",
    group: "planning",
  },
  {
    capability: "cruise",
    href: "/cruise.html",
    icon: "CR",
    navTitle: "Cruise",
    tag: "Reiseflug",
    title: "Cruise",
    description: "Drehzahl, Kraftstoffverbrauch und TAS.",
    source: "POH 5.3.10, 5.3.11, 5.3.12",
    group: "planning",
  },
  {
    capability: "landing",
    href: "/landing.html",
    icon: "LDG",
    navTitle: "Landing",
    tag: "Landestrecke",
    title: "Landing",
    description: "Landerollstrecke und Landestrecke über Hindernis.",
    source: "POH 5.3.15",
    group: "planning",
  },
  {
    capability: "stall",
    href: "/stall.html",
    icon: "VS",
    navTitle: "Stall",
    tag: "Überziehgeschwindigkeit",
    title: "Stall",
    description: "VS0 und VS1 nach Masse, Klappen und Leistung.",
    source: "POH 5.3.4",
    group: "reference",
  },
  {
    capability: "climbRate",
    href: "/climb_rate.html",
    icon: "VY",
    navTitle: "Climb Rate",
    tag: "Steigleistung",
    title: "Climb Rate",
    description: "Rate of Climb und VY nach Masse und Dichtehöhe.",
    source: "POH 5.3.8",
    group: "reference",
  },
];
