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
    weightBalance: <><path d="M12 3v18M6 6h12M8 6l-4 7h8L8 6zm8 0-4 7h8l-4-7zM8 21h8" /></>,
    takeoff: <><path d="M3 19h18" /><path d="M5 15l4 .5 8-5.5 2 1.5-6 5-6 1zM9 15.5 7 11l1.5-.5 4 3" /></>,
    climb: <><path d="M4 19 19 5M13 5h6v6" /><path d="m5 14 4 .5 3-2" /></>,
    cruise: <><circle cx="12" cy="12" r="8" /><path d="M7 15a6 6 0 0 1 10 0M12 12l4-3M12 18v1" /></>,
    landing: <><path d="M3 19h18" /><path d="m5 9 4 1 8 5.5 2-1.5-6-5-6-1zM9 10l-2 4.5" /></>,
    stall: <><path d="M12 4 3 20h18L12 4zM12 9v5M12 17h.01" /></>,
    climbRate: <><path d="M5 19h14M8 16V9M12 16V6M16 16V3M13 6l3-3 3 3" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" {...common}>{paths[capability]}</svg>;
}
