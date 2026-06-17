import { Info, LayoutGrid, Settings } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { calculatorRegistry } from "../app/calculators";
import type { AircraftDefinition } from "../app/aircraft";
import { CalculatorIcon } from "./CalculatorIcon";

type AppHeaderProps = {
  aircraft: AircraftDefinition;
  currentNavigationHref?: string;
  onOpenUsageNotice: () => void;
};

export function AppHeader({
  aircraft,
  currentNavigationHref,
  onOpenUsageNotice,
}: AppHeaderProps) {
  const availableCalculators = calculatorRegistry.filter((calculator) => aircraft.capabilities.includes(calculator.capability));
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    navigationRef.current?.querySelector(".calculator-tab.current")?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentNavigationHref]);

  return (
    <header className="app-shell-header">
      <div className="app-header-row">
        <Link className="app-brand" to="/" aria-label="Zur Rechnerübersicht">
          <span className="app-brand-mark">G115</span>
          <span className="app-brand-copy">
            <strong>{aircraft.shortName}</strong>
            <span>Aircraft Performance</span>
          </span>
        </Link>
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
        <div className="app-actions">
          <button className="app-icon-button" type="button" aria-label="Hinweis zur Nutzung" onClick={onOpenUsageNotice}>
            <Info aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
