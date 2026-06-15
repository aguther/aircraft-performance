import { Laptop, Moon, RotateCcw, Settings, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ThemePreference } from "../app/theme";

export function SettingsPage({
  preference,
  onResetFlightPlan,
  onSelectTheme,
}: {
  preference: ThemePreference;
  onResetFlightPlan: () => void;
  onSelectTheme: (preference: ThemePreference) => void;
}) {
  const navigate = useNavigate();
  const themeOptions = [
    { value: "auto", label: "Automatisch", Icon: Laptop },
    { value: "light", label: "Hell", Icon: Sun },
    { value: "dark", label: "Dunkel", Icon: Moon },
  ] as const;

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
        <div className="settings-page-row settings-theme-row">
          <Moon aria-hidden="true" />
          <span><strong>Darstellung</strong><small>Farbschema der Anwendung</small></span>
          <div className="settings-theme-options" role="group" aria-label="Farbschema">
            {themeOptions.map(({ value, label, Icon }) => (
              <button
                className={preference === value ? "active" : ""}
                type="button"
                aria-pressed={preference === value}
                onClick={() => onSelectTheme(value)}
                key={value}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
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
