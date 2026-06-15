import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Gauge,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Weight,
} from "lucide-react";
import type { AircraftCapability } from "../app/aircraft";

export function CalculatorIcon({ capability }: { capability: AircraftCapability }) {
  if (capability === "climb") {
    return (
      <span className="calculator-icon-combined" aria-hidden="true">
        <Plane />
        <ArrowUpRight />
      </span>
    );
  }

  const icons = {
    weightBalance: Weight,
    takeoff: PlaneTakeoff,
    cruise: Plane,
    landing: PlaneLanding,
    stall: Gauge,
    climbRate: ChartNoAxesCombined,
  };
  const Icon = icons[capability];
  return <Icon aria-hidden="true" />;
}
