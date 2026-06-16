import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useAircraft } from "./app/AircraftContext";
import { useFlightPlan } from "./app/FlightPlanContext";
import { useTheme } from "./app/useTheme";
import { AppHeader } from "./components/AppHeader";
import {
  hasAcceptedUsageNotice,
  UsageNotice,
} from "./components/UsageNotice";
import { HomePage } from "./pages/HomePage";
import { ClimbPage } from "./pages/ClimbPage";
import { ClimbRatePage } from "./pages/ClimbRatePage";
import { CruisePage } from "./pages/CruisePage";
import { LandingPage } from "./pages/LandingPage";
import { StallPage } from "./pages/StallPage";
import { TakeoffPage } from "./pages/TakeoffPage";
import { WeightBalancePage } from "./pages/WeightBalancePage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  const location = useLocation();
  const { aircraft, availableAircraft, selectAircraft } = useAircraft();
  const { resetFlightPlan } = useFlightPlan();
  const { preference, resolvedTheme, setThemePreference } = useTheme();
  const [usageNoticeOpen, setUsageNoticeOpen] = useState(
    () => !hasAcceptedUsageNotice(),
  );
  const isWeightBalance = location.pathname === "/weight_balance.html";
  const isTakeoff = location.pathname === "/takeoff.html";
  const isLanding = location.pathname === "/landing.html";
  const isCruise = location.pathname === "/cruise.html";
  const isClimb = location.pathname === "/climb.html";
  const isClimbRate = location.pathname === "/climb_rate.html";
  const isStall = location.pathname === "/stall.html";
  const isSettings = location.pathname === "/settings.html";
  const pageTitle = isWeightBalance
    ? "Weight & Balance"
    : isTakeoff
      ? "Takeoff"
      : isLanding
        ? "Landing"
        : isCruise
          ? "Cruise"
          : isClimb
            ? "Climb"
            : isClimbRate
              ? "Climb Rate"
              : isStall
              ? "Stall"
              : isSettings
                ? "Einstellungen"
                : "Performance";
  const currentCalculatorHref = isWeightBalance
    ? "/weight_balance.html"
    : isTakeoff
      ? "/takeoff.html"
      : isLanding
        ? "/landing.html"
        : isCruise
          ? "/cruise.html"
          : isClimb
            ? "/climb.html"
            : isClimbRate
              ? "/climb_rate.html"
              : isStall
              ? "/stall.html"
              : isSettings
                ? "/settings.html"
                : "/";

  useEffect(() => {
    document.title = `${aircraft.shortName} — ${pageTitle === "Performance" ? "Performance Calculators" : pageTitle}`;
  }, [aircraft.shortName, pageTitle]);

  return (
    <>
      <AppHeader
        aircraft={aircraft}
        availableAircraft={availableAircraft}
        onSelectAircraft={selectAircraft}
        pageTitle={pageTitle}
        currentNavigationHref={currentCalculatorHref}
        onOpenUsageNotice={() => setUsageNoticeOpen(true)}
      />
      <Routes>
        <Route path="/" element={<HomePage aircraft={aircraft} availableAircraft={availableAircraft} onResetFlightPlan={resetFlightPlan} onSelectAircraft={selectAircraft} />} />
        <Route path="/index.html" element={<HomePage aircraft={aircraft} availableAircraft={availableAircraft} onResetFlightPlan={resetFlightPlan} onSelectAircraft={selectAircraft} />} />
        <Route path="/weight_balance.html" element={<WeightBalancePage />} />
        <Route path="/takeoff.html" element={<TakeoffPage />} />
        <Route path="/landing.html" element={<LandingPage />} />
        <Route path="/cruise.html" element={<CruisePage />} />
        <Route path="/climb.html" element={<ClimbPage />} />
        <Route path="/climb_rate.html" element={<ClimbRatePage />} />
        <Route path="/stall.html" element={<StallPage />} />
        <Route path="/settings.html" element={<SettingsPage preference={preference} onSelectTheme={setThemePreference} />} />
        <Route path="*" element={<HomePage aircraft={aircraft} availableAircraft={availableAircraft} onResetFlightPlan={resetFlightPlan} onSelectAircraft={selectAircraft} />} />
      </Routes>
      <UsageNotice
        open={usageNoticeOpen}
        onClose={() => setUsageNoticeOpen(false)}
      />
    </>
  );
}
