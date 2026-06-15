import { Info, LayoutGrid, Settings } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { calculatorRegistry } from "../app/calculators";
import type { AircraftDefinition } from "../app/aircraft";
import { CalculatorIcon } from "./CalculatorIcon";

type AppHeaderProps = {
  aircraft: AircraftDefinition;
  availableAircraft: AircraftDefinition[];
  pageTitle: string;
  currentNavigationHref?: string;
  onOpenUsageNotice: () => void;
  onSelectAircraft: (aircraftId: string) => void;
};

export function AppHeader({
  aircraft,
  availableAircraft,
  pageTitle,
  currentNavigationHref,
  onOpenUsageNotice,
  onSelectAircraft,
}: AppHeaderProps) {
  const availableCalculators = calculatorRegistry.filter((calculator) => aircraft.capabilities.includes(calculator.capability));
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    navigationRef.current?.querySelector(".calculator-tab.current")?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentNavigationHref]);

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
        <div className="app-actions">
          <button className="app-icon-button" type="button" aria-label="Hinweis zur Nutzung" onClick={onOpenUsageNotice}>
            <Info aria-hidden="true" />
          </button>
        </div>
      </div>
      <nav className="calculator-tabs" aria-label="Rechner" ref={navigationRef}>
        <Link className={`calculator-tab${currentNavigationHref === "/" ? " current" : ""}`} to="/">
          <LayoutGrid aria-hidden="true" />
          <span>Übersicht</span>
        </Link>
        {availableCalculators.map((calculator) => (
          <Link className={`calculator-tab${calculator.href === currentNavigationHref ? " current" : ""}`} to={calculator.href} key={calculator.href}>
            <CalculatorIcon capability={calculator.capability} />
            <span>{calculator.navTitle}</span>
          </Link>
        ))}
        <Link className={`calculator-tab${currentNavigationHref === "/settings.html" ? " current" : ""}`} to="/settings.html">
          <Settings aria-hidden="true" />
          <span>Einstellungen</span>
        </Link>
      </nav>
    </header>
  );
}
