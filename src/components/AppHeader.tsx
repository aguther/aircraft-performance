import type { ResolvedTheme, ThemePreference } from "../app/theme";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { calculatorRegistry } from "../app/calculators";
import type { AircraftDefinition } from "../app/aircraft";
import { CalculatorIcon } from "./CalculatorIcon";

type AppHeaderProps = {
  aircraft: AircraftDefinition;
  availableAircraft: AircraftDefinition[];
  pageTitle: string;
  currentCalculatorHref?: string;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onOpenUsageNotice: () => void;
  onResetFlightPlan: () => void;
  onSelectAircraft: (aircraftId: string) => void;
  onToggleTheme: () => void;
};

export function AppHeader({
  aircraft,
  availableAircraft,
  pageTitle,
  currentCalculatorHref,
  themePreference,
  resolvedTheme,
  onOpenUsageNotice,
  onResetFlightPlan,
  onSelectAircraft,
  onToggleTheme,
}: AppHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const themeLabel = themePreference === "auto" ? "Auto" : resolvedTheme === "dark" ? "Dunkel" : "Hell";
  const availableCalculators = calculatorRegistry.filter((calculator) => aircraft.capabilities.includes(calculator.capability));

  useEffect(() => {
    const closeSettings = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("click", closeSettings);
    return () => document.removeEventListener("click", closeSettings);
  }, []);

  const resetFlightPlan = () => {
    if (!window.confirm("Neue Flugplanung starten? Alle gespeicherten Eingaben, Flugplätze und übernommenen Werte werden zurückgesetzt.")) return;
    onResetFlightPlan();
    setSettingsOpen(false);
  };

  return (
    <header className="app-shell-header">
      <div className="app-topbar">
        <Link className="app-brand" to="/" aria-label="Zur Rechnerübersicht">
          <span className="app-brand-mark">G115</span>
          <span className="app-brand-copy">
            <strong>Performance</strong>
            <span>Flugplanung & Leistungsdaten</span>
          </span>
        </Link>
        <div className="app-page-context">
          <select
            className="nav-aircraft-select"
            aria-label="Flugzeugtyp"
            value={aircraft.id}
            disabled={availableAircraft.length < 2}
            onChange={(event) => onSelectAircraft(event.target.value)}
          >
            {availableAircraft.map((option) => <option value={option.id} key={option.id}>{option.shortName}</option>)}
          </select>
          <div className="nav-title">{pageTitle}</div>
        </div>
        <div className="app-actions" ref={settingsRef}>
          <button className="app-icon-button" type="button" aria-label="Hinweis zur Nutzung" onClick={onOpenUsageNotice}>
            <span className="usage-notice-open-icon" aria-hidden="true">i</span>
          </button>
          <button className={`app-icon-button settings-button${settingsOpen ? " active" : ""}`} type="button" aria-label="Einstellungen" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((current) => !current)}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4l2-1-2-4-2 .5-1.5-1L16 4h-4l-.5 2.5-1.5 1L8 7 6 11l2 1v2l-2 1 2 4 2-.5 1.5 1L12 22h4l.5-2.5 1.5-1 2 .5 2-4-2-1z" /></svg>
          </button>
          <div className={`settings-panel${settingsOpen ? " open" : ""}`}>
            <div className="settings-panel-title">Einstellungen</div>
            <button className="settings-row" type="button" onClick={onToggleTheme}>
              <span><strong>Darstellung</strong><small>Farbschema der Anwendung</small></span>
              <span className="settings-value">{themeLabel}</span>
            </button>
            <button className="settings-row" type="button" onClick={onOpenUsageNotice}>
              <span><strong>Wichtiger Hinweis</strong><small>Nutzungshinweis erneut anzeigen</small></span>
              <span className="settings-chevron">›</span>
            </button>
            <button className="settings-row settings-row-danger" type="button" onClick={resetFlightPlan}>
              <span><strong>Neue Flugplanung</strong><small>Alle Planungsdaten zurücksetzen</small></span>
              <span className="settings-chevron">↻</span>
            </button>
          </div>
        </div>
      </div>
      <nav className="calculator-tabs" aria-label="Rechner">
        <Link className={`calculator-tab calculator-tab-home${currentCalculatorHref ? "" : " current"}`} to="/">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 10.5L12 4l8 6.5V20h-6v-6h-4v6H4z" /></svg>
          <span>Übersicht</span>
        </Link>
        {availableCalculators.map((calculator) => (
          <Link className={`calculator-tab${calculator.href === currentCalculatorHref ? " current" : ""}`} to={calculator.href} key={calculator.href}>
            <CalculatorIcon capability={calculator.capability} />
            <span>{calculator.title}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
