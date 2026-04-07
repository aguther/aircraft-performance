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

Die Seiten sind als Progressive Web App (PWA) vorbereitet und koennen auf iOS und Android zum Homescreen hinzugefuegt werden.

Wichtig: Die Installation funktioniert nur ueber `http://localhost` oder ueber HTTPS, nicht beim direkten Oeffnen der HTML-Dateien via `file://`.

Zum lokalen Testen reicht ein einfacher statischer Webserver im Repository-Ordner, zum Beispiel:

```powershell
python -m http.server 8080
```

Danach die App unter `http://localhost:8080` im Browser oeffnen und von dort installieren.

---

## Code-Struktur

Die Rechenlogik ist jetzt bewusst von der HTML-Oberflaeche getrennt:

- `js/g115b-core.js`
  Enthält die gemeinsamen Rechenhilfen wie Interpolation, Pressure Altitude, Density Altitude und Einheitenumrechnungen.
- `js/performance-data.js`
  Enthält die Tabellen und Datensaetze der einzelnen Rechner in lesbarer Form.
- `js/g115b-calculators.js`
  Enthält die eigentlichen fachlichen Berechnungen als pure Funktionen ohne DOM-Zugriffe.
- `js/pages/*.js`
  Enthält pro Rechner nur noch den Seiten-Controller: Eingaben auslesen, Calculator aufrufen, Ergebnis rendern.
- `css/theme.css`
  Enthält die zentralen Theme-Variablen sowie die gemeinsamen App-/Navigations-Styles.
- `css/calculator.css`
  Enthält die gemeinsame Oberflaeche aller Rechnerseiten.
- `css/index.css`
  Enthält die spezifischen Styles der Uebersichtsseite.

Damit sind die fachlichen Daten und die eigentliche Berechnung deutlich einfacher zu prüfen als in den vorherigen großen Inline-Skripten der HTML-Dateien.
Die DOM-Zugriffe sind auf die Page-Controller beschraenkt, waehrend die Berechnungen selbst browserunabhaengig bleiben.
