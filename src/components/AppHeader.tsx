import type { ResolvedTheme, ThemePreference } from "../app/theme";

type AppHeaderProps = {
  aircraftName: string;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onOpenUsageNotice: () => void;
  onToggleTheme: () => void;
};

export function AppHeader({
  aircraftName,
  themePreference,
  resolvedTheme,
  onOpenUsageNotice,
  onToggleTheme,
}: AppHeaderProps) {
  const themeLabel =
    themePreference === "auto"
      ? "Auto"
      : resolvedTheme === "dark"
        ? "Dark"
        : "Light";

  return (
    <nav className="nav-bar">
      <div className="nav-left nav-left-placeholder" aria-hidden="true">
        <a className="nav-back" href="#">
          <span className="nav-back-arrow">←</span>
          <span>Zurück</span>
        </a>
      </div>
      <div className="nav-center">
        <div className="nav-logo">{aircraftName}</div>
        <div className="nav-title">Performance</div>
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

