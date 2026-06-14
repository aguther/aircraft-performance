import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { aircraftRegistry, defaultAircraft, type AircraftDefinition } from "./aircraft";

const AIRCRAFT_STORAGE_KEY = "performance-calculators-aircraft";

type AircraftContextValue = {
  aircraft: AircraftDefinition;
  availableAircraft: AircraftDefinition[];
  selectAircraft: (aircraftId: string) => void;
};

const AircraftContext = createContext<AircraftContextValue | null>(null);

function storedAircraftId() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AIRCRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function AircraftProvider({
  children,
  availableAircraft = aircraftRegistry,
}: {
  children: ReactNode;
  availableAircraft?: AircraftDefinition[];
}) {
  const fallbackAircraft = availableAircraft[0] ?? defaultAircraft;
  const [selectedAircraftId, setSelectedAircraftId] = useState(() => storedAircraftId() ?? fallbackAircraft.id);
  const aircraft = availableAircraft.find(({ id }) => id === selectedAircraftId) ?? fallbackAircraft;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(AIRCRAFT_STORAGE_KEY, aircraft.id);
    } catch {
      // Storage is optional; the selected aircraft still remains active for this session.
    }
  }, [aircraft.id]);

  const value = useMemo<AircraftContextValue>(() => ({
    aircraft,
    availableAircraft,
    selectAircraft: setSelectedAircraftId,
  }), [aircraft, availableAircraft]);

  return <AircraftContext.Provider value={value}>{children}</AircraftContext.Provider>;
}

export function useAircraft() {
  const context = useContext(AircraftContext);
  if (!context) throw new Error("useAircraft must be used within AircraftProvider.");
  return context;
}
