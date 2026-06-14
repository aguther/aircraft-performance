import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

const FLIGHT_PLAN_STORAGE_KEY = "performance-calculators-flight-plan";

export type WeightBalancePlan = {
  registration: string;
  pilotMassKg: number;
  copilotMassKg: number;
  baggageMassKg: number;
  startFuelLiters: number;
  plannedFuelBurnLiters: number;
};

export type FlightPlanMasses = {
  startMassKg: number;
  landingMassKg: number;
  startFuelLiters: number;
  landingFuelLiters: number;
  updatedAt: string;
};

export type FlightPlan = {
  weightBalance: WeightBalancePlan;
  masses?: FlightPlanMasses;
};

type FlightPlanContextValue = {
  flightPlan: FlightPlan;
  updateWeightBalance: (change: Partial<WeightBalancePlan>) => void;
  publishMasses: (masses: Omit<FlightPlanMasses, "updatedAt">) => void;
};

const defaultFlightPlan: FlightPlan = {
  weightBalance: {
    registration: "D-EBFT",
    pilotMassKg: 85,
    copilotMassKg: 0,
    baggageMassKg: 0,
    startFuelLiters: 107,
    plannedFuelBurnLiters: 0,
  },
};

const FlightPlanContext = createContext<FlightPlanContextValue | null>(null);

function loadFlightPlan(): FlightPlan {
  if (typeof window === "undefined") return defaultFlightPlan;
  try {
    const stored = window.localStorage.getItem(FLIGHT_PLAN_STORAGE_KEY);
    if (!stored) return defaultFlightPlan;
    const parsed = JSON.parse(stored) as Partial<FlightPlan>;
    return {
      ...defaultFlightPlan,
      ...parsed,
      weightBalance: { ...defaultFlightPlan.weightBalance, ...parsed.weightBalance },
    };
  } catch {
    return defaultFlightPlan;
  }
}

export function FlightPlanProvider({ children }: { children: ReactNode }) {
  const [flightPlan, setFlightPlan] = useState(loadFlightPlan);
  const updateWeightBalance = useCallback((change: Partial<WeightBalancePlan>) => setFlightPlan((current) => ({
    ...current,
    weightBalance: { ...current.weightBalance, ...change },
  })), []);
  const publishMasses = useCallback((masses: Omit<FlightPlanMasses, "updatedAt">) => setFlightPlan((current) => ({
    ...current,
    masses: { ...masses, updatedAt: new Date().toISOString() },
  })), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FLIGHT_PLAN_STORAGE_KEY, JSON.stringify(flightPlan));
    } catch {
      // Storage is optional; the flight plan still remains active for this session.
    }
  }, [flightPlan]);

  const value = useMemo<FlightPlanContextValue>(() => ({
    flightPlan,
    updateWeightBalance,
    publishMasses,
  }), [flightPlan, publishMasses, updateWeightBalance]);

  return <FlightPlanContext.Provider value={value}>{children}</FlightPlanContext.Provider>;
}

export function useFlightPlan() {
  const context = useContext(FlightPlanContext);
  if (!context) throw new Error("useFlightPlan must be used within FlightPlanProvider.");
  return context;
}
