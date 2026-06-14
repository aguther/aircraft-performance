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
import { WeightBalancePage } from "./pages/WeightBalancePage";

export function App() {
  const location = useLocation();
  const { preference, resolvedTheme, toggleTheme } = useTheme();
  const [usageNoticeOpen, setUsageNoticeOpen] = useState(
    () => !hasAcceptedUsageNotice(),
  );
  const isWeightBalance = location.pathname === "/weight_balance.html";

  useEffect(() => {
    document.title = isWeightBalance
      ? "Grob 115B — Weight & Balance"
      : "Grob 115B — Performance Calculators";
  }, [isWeightBalance]);

  return (
    <>
      <AppHeader
        aircraftName={defaultAircraft.shortName}
        pageTitle={isWeightBalance ? "Weight & Balance" : "Performance"}
        currentCalculatorHref={isWeightBalance ? "/weight_balance.html" : undefined}
        showNavigation={isWeightBalance}
        themePreference={preference}
        resolvedTheme={resolvedTheme}
        onOpenUsageNotice={() => setUsageNoticeOpen(true)}
        onToggleTheme={toggleTheme}
      />
      <Routes>
        <Route path="/" element={<HomePage aircraft={defaultAircraft} />} />
        <Route path="/index.html" element={<HomePage aircraft={defaultAircraft} />} />
        <Route path="/weight_balance.html" element={<WeightBalancePage />} />
        <Route path="*" element={<HomePage aircraft={defaultAircraft} />} />
      </Routes>
      <UsageNotice
        open={usageNoticeOpen}
        onClose={() => setUsageNoticeOpen(false)}
      />
    </>
  );
}
