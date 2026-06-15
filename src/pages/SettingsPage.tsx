import { Moon, RotateCcw, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ResolvedTheme, ThemePreference } from "../app/theme";

export function SettingsPage({
  preference,
  resolvedTheme,
  onResetFlightPlan,
  onToggleTheme,
}: {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onResetFlightPlan: () => void;
  onToggleTheme: () => void;
}) {
  const navigate = useNavigate();
  const themeLabel = preference === "auto" ? "Automatisch" : resolvedTheme === "dark" ? "Dunkel" : "Hell";

  const resetFlightPlan = () => {
    if (!window.confirm("Neue Flugplanung starten? Alle gespeicherten Eingaben, Flugplätze und übernommenen Werte werden zurückgesetzt.")) return;
    onResetFlightPlan();
    navigate("/");
  };

  return (
    <main className="settings-page">
      <section className="settings-page-card settings-page-intro">
        <Settings aria-hidden="true" />
        <div>
          <h1>Einstellungen</h1>
          <p>Darstellung und zentrale Funktionen der Anwendung.</p>
        </div>
      </section>
      <section className="settings-page-card">
        <button className="settings-page-row" type="button" onClick={onToggleTheme}>
          <Moon aria-hidden="true" />
          <span><strong>Darstellung</strong><small>Farbschema der Anwendung</small></span>
          <b>{themeLabel}</b>
        </button>
      </section>
      <section className="settings-page-card">
        <button className="settings-page-row settings-page-row-danger" type="button" onClick={resetFlightPlan}>
          <RotateCcw aria-hidden="true" />
          <span><strong>Neue Flugplanung</strong><small>Alle gespeicherten Planungsdaten zurücksetzen</small></span>
          <b>Reset</b>
        </button>
      </section>
    </main>
  );
}
