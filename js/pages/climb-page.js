(function () {
  const { calculators, core, data, ui } = window.G115B;
  const LEG_DEFAULTS = {
    from: { altitudeFt: 0, flightLevel: 0, densityAltitudeFt: 0, oatC: 15, qnhHpa: 1013 },
    to: { altitudeFt: 4500, flightLevel: 45, densityAltitudeFt: 4500, oatC: 6, qnhHpa: 1013 },
  };
  const legModes = { from: "alt", to: "alt" };
  const CHART = { width: 929, height: 1400, left: 170, top: 337, bottom: 879, fuelY: 824, maxDa: 20000 };
  const START_COLOR = "#e15a18";
  const DESTINATION_COLOR = "#008fc7";

  function readNumberValue(element, defaultValue) {
    if (!element || element.value === "") return defaultValue;
    return Number.parseFloat(String(element.value).replace(",", "."));
  }

  function getElements() {
    return {
      resultRoot: document.getElementById("rp"),
      pageLayout: document.querySelector(".page-layout"),
    };
  }

  function getLegElements(whichLeg) {
    return {
      altitude: document.getElementById(`${whichLeg}-alt`),
      qnh: document.getElementById(`${whichLeg}-qnh`),
      flightLevel: document.getElementById(`${whichLeg}-fl`),
      densityAltitudeDirect: document.getElementById(`${whichLeg}-da-direct`),
      oat: document.getElementById(`${whichLeg}-oat`),
      densityAltitudeValue: document.getElementById(`${whichLeg}-da-val`),
      oatField: document.getElementById(`${whichLeg}-oat-field`),
      densityAltitudeBox: document.getElementById(`${whichLeg}-da-box`),
    };
  }

  function readLegDensityAltitudeFt(whichLeg) {
    const mode = legModes[whichLeg];
    const elements = getLegElements(whichLeg);
    const defaults = LEG_DEFAULTS[whichLeg];
    if (mode === "da") return readNumberValue(elements.densityAltitudeDirect, defaults.densityAltitudeFt);

    const pressureAltitudeFt = mode === "alt"
      ? core.pressureAltitudeFromQnh(readNumberValue(elements.altitude, defaults.altitudeFt), readNumberValue(elements.qnh, defaults.qnhHpa))
      : core.flightLevelToFeet(readNumberValue(elements.flightLevel, defaults.flightLevel));
    const atmosphere = core.densityAltitude(pressureAltitudeFt, readNumberValue(elements.oat, defaults.oatC));
    elements.densityAltitudeValue.textContent = `${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft`;
    return atmosphere.densityAltitudeFt;
  }

  function describeLeg(whichLeg) {
    const mode = legModes[whichLeg];
    const elements = getLegElements(whichLeg);
    const defaults = LEG_DEFAULTS[whichLeg];
    if (mode === "da") return `Dichtehöhe ${readNumberValue(elements.densityAltitudeDirect, defaults.densityAltitudeFt).toLocaleString("de-DE")} ft`;
    const oat = readNumberValue(elements.oat, defaults.oatC);
    if (mode === "fl") return `FL ${readNumberValue(elements.flightLevel, defaults.flightLevel)} · OAT ${oat} °C`;
    return `Höhe ${readNumberValue(elements.altitude, defaults.altitudeFt).toLocaleString("de-DE")} ft · QNH ${readNumberValue(elements.qnh, defaults.qnhHpa)} hPa · OAT ${oat} °C`;
  }

  function svgElement(tagName, attributes, text) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function chartY(densityAltitudeFt) {
    const axis = data.climb.chartAxes.densityAltitudeFt;
    return core.interpolate1D(axis.values, axis.pixels, Math.min(CHART.maxDa, Math.max(0, densityAltitudeFt)));
  }

  function addAxisMarker(svg, x, y, color) {
    svg.append(svgElement("circle", { class: "climb-chart-point", cx: x, cy: y, r: 5, fill: color, stroke: "#ffffff", "stroke-width": 0 }));
  }

  function createClimbOverlay(inputs, result) {
    const svg = svgElement("svg", {
      class: "climb-chart-overlay",
      viewBox: `0 0 ${CHART.width} ${CHART.height}`,
      xmlns: "http://www.w3.org/2000/svg",
      role: "img",
      "aria-label": "Grafischer Rechenweg für Steigzeit, Kraftstoffverbrauch und Steigflugstrecke",
    });
    if (result.error) return svg;

    [
      { label: "Start", da: Math.min(result.chartMaximumDensityAltitudeFt, Math.max(0, inputs.departureDensityAltitudeFt)), values: result.departureCumulative, color: START_COLOR },
      { label: "Ziel", da: Math.min(result.chartMaximumDensityAltitudeFt, Math.max(0, inputs.destinationDensityAltitudeFt)), values: result.destinationCumulative, color: DESTINATION_COLOR },
    ].forEach((trace) => {
      const x = trace.values.chartPixelX;
      const y = chartY(trace.da);
      svg.append(svgElement("polyline", {
        class: "climb-chart-path",
        points: `${CHART.left},${y} ${x},${y} ${x},${CHART.bottom} ${x},${CHART.top}`,
        stroke: trace.color,
        fill: "none",
        "stroke-width": 4,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }));
      [CHART.top, CHART.fuelY, CHART.bottom, y].forEach((markerY) => addAxisMarker(svg, x, markerY, trace.color));
      addAxisMarker(svg, CHART.left, y, trace.color);
    });

    return svg;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG konnte nicht erzeugt werden.")), "image/png"));
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function drawExportText(context, text, x, y, options = {}) {
    context.fillStyle = options.color || "#152235";
    context.font = `${options.weight || 600} ${options.size || 24}px "Segoe UI", Arial, sans-serif`;
    context.fillText(text, x, y);
  }

  function drawExportField(context, label, value, x, y, width) {
    context.fillStyle = "#f4f8fb";
    context.strokeStyle = "#d8e3eb";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x, y, width, 72, 10);
    context.fill();
    context.stroke();
    drawExportText(context, label.toUpperCase(), x + 14, y + 24, { size: 13, weight: 700, color: "#607487" });
    drawExportText(context, value, x + 14, y + 54, { size: 19, weight: 700 });
  }

  function utcTimestamp(date) {
    return date.toISOString().replace("T", " ").replace(/:/g, "-").slice(0, 19);
  }

  async function exportChartImage(inputs, result, overlay, button) {
    button.disabled = true;
    button.textContent = "Erzeuge PNG…";
    let svgUrl;
    try {
      const exportDate = new Date();
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 2280;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawExportText(context, `${utcTimestamp(exportDate)}Z – Grob G115B Steigflugberechnung`, 40, 52, { size: 27, weight: 700 });
      drawExportText(context, "Eingangswerte", 40, 94, { size: 18, weight: 700, color: "#006f9f" });
      drawExportField(context, "Start", describeLeg("from"), 40, 110, 550);
      drawExportField(context, "Ziel", describeLeg("to"), 610, 110, 550);
      drawExportField(context, "Start-Dichtehöhe", `${inputs.departureDensityAltitudeFt.toLocaleString("de-DE")} ft`, 40, 198, 550);
      drawExportField(context, "Ziel-Dichtehöhe", `${inputs.destinationDensityAltitudeFt.toLocaleString("de-DE")} ft`, 610, 198, 550);
      drawExportText(context, "Ergebnis", 40, 310, { size: 18, weight: 700, color: "#006f9f" });
      drawExportField(context, "Steigzeit", `${result.climbTimeMinutes.toFixed(1)} min`, 40, 326, 360);
      drawExportField(context, "Kraftstoff", `${result.climbFuelLiters.toFixed(1)} l`, 420, 326, 360);
      drawExportField(context, "Strecke", `${result.climbDistanceKm.toFixed(1)} km / ${result.climbDistanceNm.toFixed(1)} nm`, 800, 326, 360);
      drawExportText(context, result.warnings.length ? `Warnungen: ${result.warnings.map((warning) => warning.text).join(" · ")}` : "Warnungen: keine", 40, 438, {
        size: 16, color: result.warnings.length ? "#9a5200" : "#526274",
      });

      const originalChart = await loadImage("assets/grob115b-climb-chart.png");
      context.drawImage(originalChart, 0, 472, 1200, 1808);
      const serializedSvg = new XMLSerializer().serializeToString(overlay);
      svgUrl = URL.createObjectURL(new Blob([serializedSvg], { type: "image/svg+xml;charset=utf-8" }));
      const overlayImage = await loadImage(svgUrl);
      context.drawImage(overlayImage, 0, 472, 1200, 1808);

      const blob = await canvasToBlob(canvas);
      const fileName = `${utcTimestamp(exportDate)}Z Grob G115B Steigflugberechnung.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Grob G115B Steigflugberechnung" });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      button.disabled = false;
      button.textContent = "Als Bild speichern";
    }
  }

  function createChartVisualization(inputs, result) {
    const overlay = createClimbOverlay(inputs, result);
    const hasResult = !result.error;
    const chartStage = ui.el(
      "div",
      { className: "climb-chart-stage" },
      ui.el("img", {
        className: "climb-chart-image",
        attrs: {
          src: "assets/grob115b-climb-chart.png",
          alt: "Originales Flughandbuchdiagramm Bild 5.3.9 Steigflug",
          width: String(CHART.width),
          height: String(CHART.height),
        },
      }),
      overlay
    );
    const toggle = ui.el("input", {
      attrs: { type: "checkbox", checked: "checked", "aria-label": "Rechenweg einblenden" },
    });
    toggle.addEventListener("change", () => chartStage.classList.toggle("overlay-hidden", !toggle.checked));
    const downloadButton = ui.el("button", { className: "takeoff-chart-download", text: "Als Bild speichern", attrs: { type: "button" } });
    downloadButton.disabled = !hasResult;
    if (!hasResult) downloadButton.title = "Für den Export ist eine gültige Steigflugstrecke erforderlich.";
    downloadButton.addEventListener("click", () => exportChartImage(inputs, result, overlay, downloadButton).catch((error) => {
      if (error.name !== "AbortError") console.error(error);
    }));
    return ui.el(
      "div",
      { className: "card takeoff-chart-card climb-chart-card" },
      ui.el(
        "div",
        { className: "takeoff-chart-header" },
        ui.el("div", {
          className: "card-title",
          text: "Grafische Nachvollziehbarkeit",
        }),
        ui.el(
          "div",
          { className: "takeoff-chart-actions" },
          ui.el(
            "label",
            { className: "takeoff-chart-toggle" },
            toggle,
            ui.el("span", { text: "Rechenweg" }),
          ),
          downloadButton,
        ),
      ),
      ui.el("div", { className: "climb-chart-scroll" }, chartStage),
      ui.el(
        "div",
        { className: "climb-chart-results" },
        ui.el(
          "div",
          { className: "climb-chart-result start" },
          ui.el("strong", { text: "Start · kumulativ" }),
          ui.el("span", {
            text: `${result.departureCumulative.timeMinutes.toFixed(1)} min · ${result.departureCumulative.fuelLiters.toFixed(1)} l · ${result.departureCumulative.distanceKm.toFixed(1)} km`,
          }),
        ),
        ui.el(
          "div",
          { className: "climb-chart-result delta" },
          ui.el("strong", { text: "Steigflug · Differenz" }),
          ui.el("span", {
            text: hasResult
              ? `${result.climbTimeMinutes.toFixed(1)} min · ${result.climbFuelLiters.toFixed(1)} l · ${result.climbDistanceKm.toFixed(1)} km · ${result.climbDistanceNm.toFixed(1)} nm`
              : "—",
          }),
        ),
        ui.el(
          "div",
          { className: "climb-chart-result destination" },
          ui.el("strong", { text: "Ziel · kumulativ" }),
          ui.el("span", {
            text: `${result.destinationCumulative.timeMinutes.toFixed(1)} min · ${result.destinationCumulative.fuelLiters.toFixed(1)} l · ${result.destinationCumulative.distanceKm.toFixed(1)} km`,
          }),
        ),
      ),
    );
  }

  function renderResult(elements, result, inputs) {
    const hasResult = !result.error;

    const contextCard = ui.createCard(
      "Rahmenbedingungen",
      ui.el("div", { className: "context-card-body" }, [
        ui.el("div", { className: "context-card-block" },
          ui.el("div", { className: "climb-cols" },
            ui.el("div", { className: "atmos-item" },
              ui.el("div", { className: "atmos-item-label", text: "Start DA" }),
              ui.el("div", { className: "atmos-item-value", text: `${inputs.departureDensityAltitudeFt.toLocaleString("de-DE")} ft` }),
              ui.el("div", { text: `Zeit kum.: ${result.departureCumulative.timeMinutes.toFixed(1)} min · Kraft.: ${result.departureCumulative.fuelLiters.toFixed(1)} l · Str.: ${result.departureCumulative.distanceKm.toFixed(1)} km`, style: { fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" } })
            ),
            ui.el("div", { className: "climb-arrow", text: "→" }),
            ui.el("div", { className: "atmos-item" },
              ui.el("div", { className: "atmos-item-label", text: "Ziel DA" }),
              ui.el("div", { className: "atmos-item-value", text: `${inputs.destinationDensityAltitudeFt.toLocaleString("de-DE")} ft` }),
              ui.el("div", { text: `Zeit kum.: ${result.destinationCumulative.timeMinutes.toFixed(1)} min · Kraft.: ${result.destinationCumulative.fuelLiters.toFixed(1)} l · Str.: ${result.destinationCumulative.distanceKm.toFixed(1)} km`, style: { fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" } })
            )
          )
        ),
        ui.el("div", { className: "context-card-block" }, [
          ui.el("div", { className: "context-divider", text: "Bedingungen" }),
          ui.el("div", { className: "conditions-grid" }, result.conditions.map((condition) => ui.el("span", { text: condition }))),
        ]),
        ui.el("div", { className: "context-card-block context-warning-block" }, [
          ui.el("div", { className: "context-divider", text: "Eingabeprüfung" }),
          ui.el("div", { className: "context-warning-slot" },
            result.error
              ? ui.createWarnings([result.error])
              : ui.el("div", { className: "context-warning-empty", text: "Start- und Ziel-Dichtehöhe sind gültig." })
          ),
        ]),
      ])
    );

    ui.replaceContent(elements.resultRoot, [
      ui.createWarnings(result.warnings),
      contextCard,
      ui.createGridCard(hasResult
        ? `Ergebnis - ${inputs.departureDensityAltitudeFt.toLocaleString("de-DE")} -> ${inputs.destinationDensityAltitudeFt.toLocaleString("de-DE")} ft DA`
        : "Ergebnis - Eingabe prüfen", "result-grid", [
        ui.createMetricItem({ label: "Steigzeit · Climb Time", value: hasResult ? result.climbTimeMinutes.toFixed(1) : "—", unit: hasResult ? "min" : "", valueStyle: { fontSize: "2.2rem" } }),
        ui.createMetricItem({ label: "Kraftstoff · Fuel", value: hasResult ? result.climbFuelLiters.toFixed(1) : "—", unit: hasResult ? "l" : "", valueStyle: { fontSize: "2.2rem" } }),
        ui.createMetricItem({ label: "Strecke · Distance", value: hasResult ? result.climbDistanceNm.toFixed(1) : "—", unit: hasResult ? "nm" : "", subtext: hasResult ? `${result.climbDistanceKm.toFixed(1)} km` : "", valueStyle: { fontSize: "2.2rem" } }),
      ]),
      createChartVisualization(inputs, result),
    ]);
  }

  function refresh() {
    const elements = getElements();
    const inputs = {
      departureDensityAltitudeFt: readLegDensityAltitudeFt("from"),
      destinationDensityAltitudeFt: readLegDensityAltitudeFt("to"),
    };
    renderResult(elements, calculators.calculateClimb(inputs), inputs);
  }

  function setLeg(whichLeg, mode) {
    legModes[whichLeg] = mode;
    ["alt", "fl", "da"].forEach((key) => {
      document.getElementById(`${whichLeg}-mode-${key}`).style.display = key === mode ? "flex" : "none";
      document.getElementById(`mode-${whichLeg}-${key}-btn`).classList.toggle("active", key === mode);
    });
    const legElements = getLegElements(whichLeg);
    legElements.oatField.style.display = mode !== "da" ? "" : "none";
    legElements.densityAltitudeBox.style.display = mode !== "da" ? "" : "none";
    ui.markResponsiveFields();
    refresh();
  }

  window.setLeg = setLeg;
  window.calcLeg = refresh;
  document.addEventListener("DOMContentLoaded", () => {
    const elements = getElements();
    elements.pageLayout.addEventListener("input", refresh);
    refresh();
  });
})();
