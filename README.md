## Haftungsausschluss / Disclaimer

### Deutsch

Die bereitgestellten Daten und Informationen dienen ausschließlich zu Demonstrations-, Lern- und/oder Entwicklungszwecken. Sie sind **nicht** für die Verwendung in der realen Flugnavigation, Flugvorbereitung oder Leistungsberechnung von Luftfahrzeugen bestimmt.

Es wird keinerlei Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der Daten übernommen. Die Nutzung der Daten für operationelle oder sicherheitsrelevante Entscheidungen erfolgt ausschließlich auf eigenes Risiko.

**Für reale Flugbetriebe sind ausschließlich offiziell veröffentlichte und zugelassene Quellen (z. B. AIP, Flughandbücher, zugelassene Performance-Daten) zu verwenden.**

---

### English

The provided data and information are intended for demonstration, educational, and/or development purposes only. They are **not** intended for use in real-world flight navigation, flight planning, or aircraft performance calculations.

No warranty is given regarding the accuracy, completeness, or currency of the data. Any use of this information for operational or safety-critical decisions is entirely at the user's own risk.

**For actual flight operations, only officially published and approved sources (e.g., AIP, aircraft flight manuals, certified performance data) must be used.**

---

## PWA / Homescreen Installation

Die Seiten sind als Progressive Web App (PWA) vorbereitet und können auf iOS und Android zum Homescreen hinzugefügt werden.

Wichtig: Die Installation funktioniert nur über `http://localhost` oder über HTTPS, nicht beim direkten Öffnen der HTML-Dateien via `file://`.

Zum lokalen Testen reicht ein einfacher statischer Webserver im Repository-Ordner, zum Beispiel:

```powershell
python -m http.server 8080
```

Danach die App unter `http://localhost:8080` im Browser öffnen und von dort installieren.

---

## Deployment auf Cloudflare Workers

Die Anwendung wird ohne externe Abhängigkeiten als statische Website gebaut. Der Build kopiert nur die auszuliefernden Dateien nach `dist`:

```powershell
npm run build
```

Cloudflare verwendet für neue Git-Deployments den gemeinsamen Workers-Dialog. Die statische Website wird dabei über Workers Static Assets ausgeliefert. `wrangler.jsonc` legt `dist` als auszulieferndes Verzeichnis fest.

Für das über GitHub verbundene Cloudflare-Projekt werden folgende Einstellungen verwendet:

| Einstellung | Wert |
| --- | --- |
| Project name | `performance-calculators` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| Path | `/` |

`main` wird als Production Branch gewählt. Builds für Non-production Branches können aktiviert bleiben.

Die Datei `_headers` ergänzt Sicherheits-Header für statische Antworten und verhindert langlebiges Browser-Caching von Service Worker und Web App Manifest. Spätere API-Zugriffe können direkt durch einen Worker ergänzt werden.

---

## Code-Struktur

Die Rechenlogik ist jetzt bewusst von der HTML-Oberfläche getrennt:

- `js/g115b-core.js`
  Enthält die gemeinsamen Rechenhilfen wie Interpolation, Pressure Altitude, Density Altitude und Einheitenumrechnungen.
- `js/performance-data.js`
  Enthält die Tabellen und Datensätze der einzelnen Rechner in lesbarer Form.
- `js/g115b-calculators.js`
  Enthält die eigentlichen fachlichen Berechnungen als pure Funktionen ohne DOM-Zugriffe.
- `js/pages/*.js`
  Enthält pro Rechner nur noch den Seiten-Controller: Eingaben auslesen, Calculator aufrufen, Ergebnis rendern.
- `css/theme.css`
  Enthält die zentralen Theme-Variablen sowie die gemeinsamen App-/Navigations-Styles.
- `css/calculator.css`
  Enthält die gemeinsame Oberfläche aller Rechnerseiten.
- `css/index.css`
  Enthält die spezifischen Styles der Übersichtsseite.

Damit sind die fachlichen Daten und die eigentliche Berechnung deutlich einfacher zu prüfen als in den vorherigen großen Inline-Skripten der HTML-Dateien.
Die DOM-Zugriffe sind auf die Page-Controller beschränkt, während die Berechnungen selbst browserunabhängig bleiben.

## Tests

Die Rechenlogik kann automatisiert mit Node.js geprüft werden:

```powershell
npm test
```

Die Tests verwenden feste Referenzfälle gegen die pure Calculator-Logik in `js/g115b-calculators.js`.
