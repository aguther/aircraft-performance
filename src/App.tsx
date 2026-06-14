import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { defaultAircraft } from "./app/aircraft";
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
import { TakeoffPage } from "./pages/TakeoffPage";
import { WeightBalancePage } from "./pages/WeightBalancePage";

export function App() {
  const location = useLocation();
  const { preference, resolvedTheme, toggleTheme } = useTheme();
  const [usageNoticeOpen, setUsageNoticeOpen] = useState(
    () => !hasAcceptedUsageNotice(),
  );
  const isWeightBalance = location.pathname === "/weight_balance.html";
  const isTakeoff = location.pathname === "/takeoff.html";
  const isLanding = location.pathname === "/landing.html";
  const isCruise = location.pathname === "/cruise.html";
  const isClimb = location.pathname === "/climb.html";
  const isClimbRate = location.pathname === "/climb_rate.html";
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
              : undefined;

  useEffect(() => {
    document.title = `Grob 115B — ${pageTitle === "Performance" ? "Performance Calculators" : pageTitle}`;
  }, [pageTitle]);

  return (
    <>
      <AppHeader
        aircraftName={defaultAircraft.shortName}
        pageTitle={pageTitle}
        currentCalculatorHref={currentCalculatorHref}
        showNavigation={Boolean(currentCalculatorHref)}
        themePreference={preference}
        resolvedTheme={resolvedTheme}
        onOpenUsageNotice={() => setUsageNoticeOpen(true)}
        onToggleTheme={toggleTheme}
      />
      <Routes>
        <Route path="/" element={<HomePage aircraft={defaultAircraft} />} />
        <Route path="/index.html" element={<HomePage aircraft={defaultAircraft} />} />
        <Route path="/weight_balance.html" element={<WeightBalancePage />} />
        <Route path="/takeoff.html" element={<TakeoffPage />} />
        <Route path="/landing.html" element={<LandingPage />} />
        <Route path="/cruise.html" element={<CruisePage />} />
        <Route path="/climb.html" element={<ClimbPage />} />
        <Route path="/climb_rate.html" element={<ClimbRatePage />} />
        <Route path="*" element={<HomePage aircraft={defaultAircraft} />} />
      </Routes>
      <UsageNotice
        open={usageNoticeOpen}
        onClose={() => setUsageNoticeOpen(false)}
      />
    </>
  );
}
