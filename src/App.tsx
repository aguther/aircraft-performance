import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { defaultAircraft } from "./app/aircraft";
import { useTheme } from "./app/useTheme";
import { AppHeader } from "./components/AppHeader";
import {
  hasAcceptedUsageNotice,
  UsageNotice,
} from "./components/UsageNotice";
import { HomePage } from "./pages/HomePage";

export function App() {
  const { preference, resolvedTheme, toggleTheme } = useTheme();
  const [usageNoticeOpen, setUsageNoticeOpen] = useState(
    () => !hasAcceptedUsageNotice(),
  );

  return (
    <>
      <AppHeader
        aircraftName={defaultAircraft.shortName}
        themePreference={preference}
        resolvedTheme={resolvedTheme}
        onOpenUsageNotice={() => setUsageNoticeOpen(true)}
        onToggleTheme={toggleTheme}
      />
      <Routes>
        <Route path="*" element={<HomePage aircraft={defaultAircraft} />} />
      </Routes>
      <UsageNotice
        open={usageNoticeOpen}
        onClose={() => setUsageNoticeOpen(false)}
      />
    </>
  );
}

