(function () {
  const { calculators, core, ui } = window.G115B;
  const DEFAULT_ELEVATION_FT = 0;
  const DEFAULT_PRESSURE_ALTITUDE_FT = 0;
  const DEFAULT_QNH_HPA = 1013;
  const DEFAULT_OAT_C = 15;
  const DEFAULT_MASS_KG = 920;
  const DEFAULT_SLOPE_PERCENT = 0;
  const DEFAULT_WIND_KT = 0;
  const DEFAULT_SAFETY_MARGIN_PERCENT = 15;

  function readNumberValue(element, defaultValue) {
    if (!element || element.value === "") return defaultValue;
    return Number.parseFloat(String(element.value).replace(",", "."));
  }

  function formatWindLabel(windKt) {
    const windKmh = core.knotsToKilometersPerHour(windKt);
    if (windKt === 0) return "Kein Wind";
    return `${Math.abs(windKt)} kt (${Math.abs(windKmh).toFixed(1)} km/h) ${windKt > 0 ? "HW" : "TW"}`;
  }

  function formatSlopeLabel(slopePercent) {
    if (slopePercent > 0) return `${slopePercent.toFixed(1)}% bergauf`;
    if (slopePercent < 0) return `${Math.abs(slopePercent).toFixed(1)}% bergab`;
    return "eben";
  }

  function createAtmosphereCardProps(atmosphere) {
    return {
      densityAltitudeFt: atmosphere.densityAltitudeFt,
      densityAltitudeWarn: atmosphere.densityAltitudeFt > 5000,
      isaDeviationText: `${core.formatSigned(atmosphere.isaDeviationC, 1)} °C`,
      isaDeviationClass: Math.abs(atmosphere.isaDeviationC) < 0.1 ? "" : atmosphere.isaDeviationC > 0 ? "warn" : "good",
    };
  }

  function createTakeoffSteps(inputs, result) {
    return [
      { name: "Schritt 1 - Atmosphaere", detail: `PA ${inputs.pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${inputs.oatC} °C`, value: `${core.round(result.groundRollByAtmosphereMeters)} m` },
      { name: "Schritt 2 - Masse", detail: `${core.round(result.groundRollByAtmosphereMeters)} m · ${inputs.massKg} kg`, value: `${core.round(result.groundRollByMassMeters)} m` },
      { name: "Schritt 3 - Slope", detail: `${core.round(result.groundRollByMassMeters)} m · ${formatSlopeLabel(inputs.slopePercent)}`, value: `${core.round(result.groundRollBySlopeMeters)} m` },
      { name: "Schritt 4 - Wind", detail: `${core.round(result.groundRollBySlopeMeters)} m · ${formatWindLabel(inputs.windKt)}`, value: `${core.round(result.groundRollByWindMeters)} m` },
      { name: "Schritt 5 - Hindernis 15 m", detail: `${core.round(result.groundRollByWindMeters)} m -> ueber 15 m`, value: `${core.round(result.takeoffDistanceWithoutMarginMeters)} m` },
      { name: `Zuschlag ${inputs.safetyMarginPercent}% auf Rollstrecke`, detail: `+${core.round(result.groundRollMarginMeters)} m auf Roll- und Startstrecke`, value: `${result.groundRollMeters} m / ${result.takeoffDistanceMeters} m` },
    ];
  }

  function chartX(value, inputMin, inputMax, pixelMin, pixelMax) {
    const boundedValue = Math.min(Math.max(inputMin, inputMax), Math.max(Math.min(inputMin, inputMax), value));
    return pixelMin + ((boundedValue - inputMin) / (inputMax - inputMin)) * (pixelMax - pixelMin);
  }

  function chartRollY(value) {
    return chartX(value, 0, 900, 820, 422);
  }

  function chartDistanceY(value) {
    const distances = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600];
    const scanY = [820, 775, 730, 687, 642, 599, 554, 510, 465, 422, 376, 329, 283, 235, 188, 141, 94];
    return core.interpolate1D(distances, scanY, value);
  }

  function createChartPoints(inputs, result) {
    const windKmh = core.knotsToKilometersPerHour(inputs.windKt);
    return [
      [chartX(inputs.oatC, -20, 40, 157, 397), 820],
      [chartX(inputs.oatC, -20, 40, 157, 397), chartRollY(result.groundRollByAtmosphereMeters)],
      [415, chartRollY(result.groundRollByAtmosphereMeters)],
      [chartX(inputs.massKg, 920, 750, 415, 650), chartRollY(result.groundRollByMassMeters)],
      [668, chartRollY(result.groundRollByMassMeters)],
      [chartX(Math.abs(inputs.slopePercent), 0, 2, 668, 777), chartRollY(result.groundRollBySlopeMeters)],
      [796, chartRollY(result.groundRollBySlopeMeters)],
      [chartX(Math.abs(windKmh), 0, 40, 796, 1029), chartRollY(result.groundRollByWindMeters)],
      [1047, chartRollY(result.groundRollByWindMeters)],
      [1227, chartDistanceY(result.takeoffDistanceWithoutMarginMeters)],
    ];
  }

  function svgElement(tagName, attributes) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG konnte nicht erzeugt werden.")), "image/png");
    });
  }

  function drawExportText(context, text, x, y, options) {
    context.fillStyle = options.color || "#152235";
    context.font = `${options.weight || 600} ${options.size || 24}px "Segoe UI", Arial, sans-serif`;
    context.fillText(text, x, y);
  }

  function drawExportField(context, label, value, x, y, width) {
    context.fillStyle = "#f4f8fb";
    context.strokeStyle = "#d8e3eb";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x, y, width, 68, 10);
    context.fill();
    context.stroke();
    drawExportText(context, label.toUpperCase(), x + 14, y + 23, { size: 13, weight: 700, color: "#607487" });
    drawExportText(context, value, x + 14, y + 52, { size: 20, weight: 700 });
  }

  function utcTimestamp(date) {
    return date.toISOString().replace("T", "_").replace(/:/g, "-").slice(0, 19);
  }

  function utcFileTimestamp(date) {
    return date.toISOString().replace("T", " ").replace(/:/g, "-").slice(0, 19);
  }

  function drawExportLegend(context, x, y) {
    context.strokeStyle = "#e5007d";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 42, y);
    context.stroke();
    drawExportText(context, "Magenta: Rechenweg und Startstrecke ohne Zuschlag", x + 56, y + 7, { size: 17, weight: 600 });

    context.beginPath();
    context.fillStyle = "#009e73";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 3;
    context.arc(x + 650, y, 7, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    drawExportText(context, "Grün, ausgefüllt: finale Startstrecke inklusive Zuschlag", x + 670, y + 7, { size: 17, weight: 600 });
  }

  async function exportChartImage(inputs, result, exportContext, button) {
    button.disabled = true;
    button.textContent = "Erzeuge PNG…";

    try {
      const exportDate = new Date();
      const timestamp = utcTimestamp(exportDate);
      const headerHeight = 660;
      const canvas = document.createElement("canvas");
      canvas.width = 1516;
      canvas.height = headerHeight + 1038;
      const context = canvas.getContext("2d");
      const image = await loadImage("assets/grob115b-takeoff-chart.png");
      const points = createChartPoints(inputs, result);
      const finalDistancePoint = [1227, chartDistanceY(result.takeoffDistanceMeters)];

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawExportText(context, `${timestamp} UTC – Grob G115B – Startstreckenberechnung`, 48, 54, { size: 30, weight: 700 });
      drawExportText(context, "Eingangswerte", 48, 96, { size: 19, weight: 700, color: "#006f9f" });
      if (exportContext.pressureAltitudeMode === "qnh") {
        drawExportField(context, "Elevation", `${exportContext.elevationFt} ft`, 48, 112, 260);
        drawExportField(context, "QNH", `${exportContext.qnhHpa} hPa`, 324, 112, 260);
        drawExportField(context, "Druckhöhe", `${inputs.pressureAltitudeFt} ft`, 600, 112, 260);
      } else {
        drawExportField(context, "Druckhöhe direkt", `${inputs.pressureAltitudeFt} ft`, 48, 112, 260);
      }
      drawExportField(context, "OAT", `${inputs.oatC} °C`, 876, 112, 260);
      drawExportField(context, "Masse", `${inputs.massKg} kg`, 1152, 112, 260);
      drawExportField(context, "Slope", formatSlopeLabel(inputs.slopePercent), 48, 192, 260);
      drawExportField(context, "Wind", formatWindLabel(inputs.windKt), 324, 192, 260);
      drawExportField(context, "Zuschlag", `${inputs.safetyMarginPercent}%`, 600, 192, 260);
      drawExportText(context, "Berechnete Atmosphärenwerte", 48, 300, { size: 19, weight: 700, color: "#006f9f" });
      drawExportField(context, "Density Altitude", `${result.atmosphere.densityAltitudeFt} ft`, 48, 316, 410);
      drawExportField(context, "ISA-Abweichung", `${core.formatSigned(result.atmosphere.isaDeviationC, 1)} °C`, 474, 316, 410);
      drawExportText(context, "Ergebnis", 48, 424, { size: 19, weight: 700, color: "#006f9f" });
      drawExportField(context, "Rollstrecke inkl. Zuschlag", `${result.groundRollMeters} m`, 48, 440, 410);
      drawExportField(context, "Startstrecke über 15 m inkl. Zuschlag", `${result.takeoffDistanceMeters} m`, 474, 440, 470);
      drawExportField(context, "Absoluter Zuschlag", `${core.round(result.groundRollMarginMeters)} m`, 960, 440, 452);
      drawExportText(
        context,
        result.warnings.length > 0 ? `Warnungen: ${result.warnings.map((warning) => warning.text).join(" · ")}` : "Warnungen: keine",
        48,
        554,
        { size: 18, weight: 600, color: result.warnings.length > 0 ? "#9a5200" : "#526274" }
      );
      drawExportLegend(context, 48, 600);

      context.drawImage(image, 0, headerHeight, 1516, 1038);
      context.save();
      context.translate(0, headerHeight);
      context.strokeStyle = "#e5007d";
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
      context.stroke();
      points.slice(1).forEach(([x, y]) => {
        context.beginPath();
        context.fillStyle = "#ffffff";
        context.strokeStyle = "#e5007d";
        context.lineWidth = 4;
        context.arc(x, y, 6, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });
      context.beginPath();
      context.fillStyle = "#009e73";
      context.strokeStyle = "#ffffff";
      context.lineWidth = 3;
      context.arc(finalDistancePoint[0], finalDistancePoint[1], 6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();

      const blob = await canvasToBlob(canvas);
      const fileName = `${utcFileTimestamp(exportDate)}Z Grob G115B Startstreckenberechnung.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Grob G115B Startstreckenberechnung" });
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
      button.disabled = false;
      button.textContent = "Als Bild speichern";
    }
  }

  function createChartVisualization(inputs, result, exportContext) {
    const points = createChartPoints(inputs, result);
    const finalDistancePoint = [1227, chartDistanceY(result.takeoffDistanceMeters)];
    const svg = svgElement("svg", {
      class: "takeoff-chart-overlay",
      viewBox: "0 0 1516 1038",
      "aria-label": "Grafischer Rechenweg im originalen Startstreckendiagramm",
    });
    svg.append(svgElement("polyline", {
      class: "takeoff-chart-path",
      points: points.map((point) => point.join(",")).join(" "),
    }));
    points.slice(1).forEach(([x, y], index) => {
      svg.append(svgElement("circle", { class: "takeoff-chart-point", cx: x, cy: y, r: index === points.length - 2 ? 7 : 5 }));
    });
    svg.append(svgElement("circle", {
      class: "takeoff-chart-final-point",
      cx: finalDistancePoint[0],
      cy: finalDistancePoint[1],
      r: 7,
    }));

    const chartStage = ui.el(
      "div",
      { className: "takeoff-chart-stage" },
      ui.el("img", {
        className: "takeoff-chart-image",
        attrs: {
          src: "assets/grob115b-takeoff-chart.png",
          alt: "Originales Flughandbuchdiagramm Bild 5.3.7 Startstrecke",
          width: "1516",
          height: "1038",
        },
      }),
      svg
    );
    const toggle = ui.el("input", {
      attrs: { type: "checkbox", checked: "checked", "aria-label": "Rechenweg einblenden" },
    });
    toggle.addEventListener("change", () => chartStage.classList.toggle("overlay-hidden", !toggle.checked));
    const downloadButton = ui.el("button", {
      className: "takeoff-chart-download",
      text: "Als Bild speichern",
      attrs: { type: "button" },
    });
    downloadButton.addEventListener("click", () => {
      exportChartImage(inputs, result, exportContext, downloadButton).catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });
    });

    return ui.el(
      "div",
      { className: "card takeoff-chart-card" },
      ui.el(
        "div",
        { className: "takeoff-chart-header" },
        ui.el("div", { className: "card-title", text: "Grafische Nachvollziehbarkeit" }),
        ui.el(
          "div",
          { className: "takeoff-chart-actions" },
          ui.el("label", { className: "takeoff-chart-toggle" }, toggle, ui.el("span", { text: "Rechenweg" })),
          downloadButton
        )
      ),
      ui.el("div", { className: "takeoff-chart-scroll" }, chartStage),
      ui.el(
        "div",
        { className: "takeoff-chart-legend" },
        ui.el("span", { className: "takeoff-chart-key", text: "Farbige Linie: unbezuschlagter Weg im Originaldiagramm" }),
        ui.el("span", {
          text: `Diagramm: ${core.round(result.groundRollByWindMeters)} m Rollstrecke -> ${core.round(result.takeoffDistanceWithoutMarginMeters)} m über 15 m`,
        }),
        ui.el("span", {
          text: `Zuschlag außerhalb des Diagramms: +${core.round(result.groundRollMarginMeters)} m`,
        }),
        ui.el("span", { className: "takeoff-chart-margin-key", text: `Grün, ausgefüllt: final ${result.takeoffDistanceMeters} m inkl. Zuschlag` })
      )
    );
  }

  function getElements() {
    return {
      elevation: document.getElementById("elev"),
      qnh: document.getElementById("qnh"),
      pressureAltitude: document.getElementById("pa"),
      pressureAltitudeValue: document.getElementById("pa-derived-val"),
      oat: document.getElementById("oat"),
      mass: document.getElementById("mass"),
      slope: document.getElementById("slope"),
      wind: document.getElementById("wind"),
      safetyMargin: document.getElementById("zuschl"),
      sidebar: document.querySelector(".sidebar"),
      resultRoot: document.getElementById("rp"),
    };
  }

  function calcPAFromQNH() {
    const elements = getElements();
    const pressureAltitudeFt = core.pressureAltitudeFromQnh(
      readNumberValue(elements.elevation, DEFAULT_ELEVATION_FT),
      readNumberValue(elements.qnh, DEFAULT_QNH_HPA)
    );
    elements.pressureAltitudeValue.textContent = `${pressureAltitudeFt.toLocaleString("de-DE")} ft`;
    elements.pressureAltitude.value = pressureAltitudeFt;
  }

  function readInputs(elements) {
    return {
      pressureAltitudeFt: readNumberValue(elements.pressureAltitude, DEFAULT_PRESSURE_ALTITUDE_FT),
      oatC: readNumberValue(elements.oat, DEFAULT_OAT_C),
      massKg: readNumberValue(elements.mass, DEFAULT_MASS_KG),
      slopePercent: readNumberValue(elements.slope, DEFAULT_SLOPE_PERCENT),
      windKt: readNumberValue(elements.wind, DEFAULT_WIND_KT),
      safetyMarginPercent: readNumberValue(elements.safetyMargin, DEFAULT_SAFETY_MARGIN_PERCENT),
    };
  }

  function readExportContext(elements) {
    const pressureAltitudeMode = document.getElementById("mode-qnh").style.display === "none" ? "direct" : "qnh";
    return {
      pressureAltitudeMode,
      elevationFt: readNumberValue(elements.elevation, DEFAULT_ELEVATION_FT),
      qnhHpa: readNumberValue(elements.qnh, DEFAULT_QNH_HPA),
    };
  }

  function renderResult(elements, inputs, result) {
    ui.replaceContent(elements.resultRoot, [
      ui.createDisclaimerCard(),
      ui.createContextCard({
        atmosphere: createAtmosphereCardProps(result.atmosphere),
        conditions: result.conditions,
        warnings: result.warnings,
      }),
      ui.createPipelineCard(createTakeoffSteps(inputs, result)),
      ui.createGridCard("Ergebnis", "result-grid", [
        ui.createMetricItem({ label: "Ground Roll · Startrollstrecke", value: result.groundRollMeters, unit: "m" }),
        ui.createMetricItem({ label: "Takeoff Distance · Startstrecke über 15 m", value: result.takeoffDistanceMeters, unit: "m" }),
      ]),
      ui.createGridCard("Geschwindigkeiten", "speed-grid", [
        ui.createMetricItem({
          className: "speed-item",
          labelClassName: "speed-item-label",
          valueClassName: "speed-item-value",
          subtextClassName: "speed-item-sub",
          label: "VR · Rotate",
          value: core.kilometersPerHourToKnots(result.rotateSpeedKmh).toFixed(1),
          unit: "kt",
          subtext: `${result.rotateSpeedKmh.toFixed(0)} km/h IAS`,
        }),
        ui.createMetricItem({
          className: "speed-item",
          labelClassName: "speed-item-label",
          valueClassName: "speed-item-value",
          subtextClassName: "speed-item-sub",
          label: "Geschw. 15 m Hoehe",
          value: core.kilometersPerHourToKnots(result.speedAt15mKmh).toFixed(1),
          unit: "kt",
          subtext: `${result.speedAt15mKmh.toFixed(0)} km/h IAS`,
        }),
      ]),
      createChartVisualization(inputs, result, readExportContext(elements)),
    ]);
  }

  function refresh() {
    const elements = getElements();
    const inputs = readInputs(elements);
    renderResult(elements, inputs, calculators.calculateTakeoff(inputs));
  }

  function setPAMode(mode) {
    ["qnh", "direct"].forEach((key) => {
      document.getElementById(`mode-${key}`).style.display = key === mode ? "flex" : "none";
      document.getElementById(`mode-${key}-btn`).classList.toggle("active", key === mode);
    });
    ui.markResponsiveFields();
    if (mode === "qnh") calcPAFromQNH();
    refresh();
  }

  window.setPAMode = setPAMode;
  window.calcPAFromQNH = calcPAFromQNH;

  document.addEventListener("DOMContentLoaded", () => {
    const elements = getElements();
    calcPAFromQNH();
    elements.sidebar.addEventListener("input", refresh);
    refresh();
  });
})();
