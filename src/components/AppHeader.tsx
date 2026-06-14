import type { ResolvedTheme, ThemePreference } from "../app/theme";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { calculatorRegistry } from "../app/calculators";

type AppHeaderProps = {
  aircraftName: string;
  pageTitle: string;
  currentCalculatorHref?: string;
  showNavigation?: boolean;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onOpenUsageNotice: () => void;
  onToggleTheme: () => void;
};

export function AppHeader({
  aircraftName,
  pageTitle,
  currentCalculatorHref,
  showNavigation = false,
  themePreference,
  resolvedTheme,
  onOpenUsageNotice,
  onToggleTheme,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const themeLabel =
    themePreference === "auto"
      ? "Auto"
      : resolvedTheme === "dark"
        ? "Dark"
        : "Light";

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };

    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  return (
    <nav className="nav-bar">
      <div
        className={`nav-left${showNavigation ? "" : " nav-left-placeholder"}`}
        aria-hidden={showNavigation ? undefined : "true"}
      >
        <Link className="nav-back" to="/">
          <span className="nav-back-arrow">←</span>
          <span>Zurück</span>
        </Link>
        {showNavigation ? (
          <div className="nav-menu-wrap" ref={menuRef}>
            <button
              className="nav-menu-btn"
              type="button"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span className="nav-back-arrow">☰</span>
              <span>Rechner</span>
            </button>
            <div className={`nav-dropdown${menuOpen ? " open" : ""}`}>
              <Link className="nav-dropdown-home" to="/" onClick={() => setMenuOpen(false)}>
                Übersicht
              </Link>
              {calculatorRegistry.map((calculator) => (
                calculator.runtime === "react" ? (
                  <Link
                    className={calculator.href === currentCalculatorHref ? "current" : undefined}
                    to={calculator.href}
                    key={calculator.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {calculator.title} · {calculator.tag}
                  </Link>
                ) : (
                  <a
                    className={calculator.href === currentCalculatorHref ? "current" : undefined}
                    href={calculator.href}
                    key={calculator.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {calculator.title} · {calculator.tag}
                  </a>
                )
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="nav-center">
        <div className="nav-logo">{aircraftName}</div>
        <div className="nav-title">{pageTitle}</div>
      </div>
      <div className="nav-right">
        <button
          className="usage-notice-open"
          type="button"
          aria-label="Hinweis zur Nutzung"
          onClick={onOpenUsageNotice}
        >
          <span className="usage-notice-open-icon" aria-hidden="true">
            i
          </span>
          <span className="usage-notice-open-label">Hinweis</span>
        </button>
        <button
          className="theme-toggle"
          type="button"
          data-theme-mode={themePreference}
          data-resolved-theme={resolvedTheme}
          aria-label={`Theme: ${themeLabel}`}
          onClick={onToggleTheme}
        >
          <span
            className="toggle-track"
            data-theme-mode={themePreference}
            data-resolved-theme={resolvedTheme}
          >
            <span
              className="toggle-thumb"
              data-theme-mode={themePreference}
              data-resolved-theme={resolvedTheme}
            />
          </span>
          <span>{themeLabel}</span>
        </button>
      </div>
    </nav>
  );
}
