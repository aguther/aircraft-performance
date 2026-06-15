import type { AircraftCapability } from "../app/aircraft";

export function CalculatorIcon({ capability }: { capability: AircraftCapability }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  const paths = {
    weightBalance: <><path d="M5 18h14M7 18l2-9h6l2 9M9 9l3-3 3 3M4 13h5M15 13h5" /><path d="M4 13l2 3 3-3M15 13l2 3 3-3" /></>,
    takeoff: <><path d="M3 18h18M5 15l13-7 2 2-8 5-4 1z" /><path d="M8 13l-2-4 2-1 4 3" /></>,
    climb: <><path d="M4 18l16-12M13 6h7v7" /><path d="M5 13l4-2 4 2-4 2z" /></>,
    cruise: <><path d="M3 12h18M8 8l4-5 4 5M8 16l4 5 4-5" /></>,
    landing: <><path d="M3 18h18M5 8l13 7-1 2-9-3-4-4z" /><path d="M8 11l-2 4" /></>,
    stall: <><path d="M5 6c5-4 11-2 14 2M19 8l-1-5M19 8l-5-1" /><path d="M5 18c5 3 10 2 14-2" /></>,
    climbRate: <><path d="M12 20V4M7 9l5-5 5 5" /><path d="M5 18h14" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" {...common}>{paths[capability]}</svg>;
}
