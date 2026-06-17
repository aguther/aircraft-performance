import { FileText, Laptop, Moon, Settings, Sun } from "lucide-react";
import { buildInfo, formatBuildVersion } from "../app/buildInfo";
import type { ThemePreference } from "../app/theme";

export function SettingsPage({
  preference,
  onOpenUsageNotice,
  onSelectTheme,
}: {
  preference: ThemePreference;
  onOpenUsageNotice: () => void;
  onSelectTheme: (preference: ThemePreference) => void;
}) {
  const themeOptions = [
    { value: "auto", label: "Automatisch", Icon: Laptop },
    { value: "light", label: "Hell", Icon: Sun },
    { value: "dark", label: "Dunkel", Icon: Moon },
  ] as const;

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
        <div className="settings-page-row settings-info-row">
          <FileText aria-hidden="true" />
          <span><strong>Disclaimer</strong><small>Hinweis zur Nutzung und Version</small></span>
          <div className="settings-meta-actions">
            <b title={`Commit ${buildInfo.fullCommit}${buildInfo.dirty ? " · lokal verändert" : ""} · Build ${buildInfo.builtAt}`}>
              {formatBuildVersion()}
            </b>
            <button type="button" onClick={onOpenUsageNotice}>Disclaimer anzeigen</button>
          </div>
        </div>
      </section>
    </main>
  );
}
