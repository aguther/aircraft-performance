(function () {
  const { calculators, core, data, ui } = window.G115B;
  const DEFAULT_ELEVATION_FT = 0;
  const DEFAULT_PRESSURE_ALTITUDE_FT = 0;
  const DEFAULT_QNH_HPA = 1013;
  const DEFAULT_OAT_C = 15;
  const DEFAULT_MASS_KG = 920;
  const DEFAULT_WIND_KT = 0;
  const DEFAULT_SAFETY_MARGIN_PERCENT = 40;

  function readNumberValue(element, defaultValue) {
    if (!element || element.value === "") return defaultValue;
    return Number.parseFloat(String(element.value).replace(",", "."));
  }

  function formatWindLabel(windKt) {
    const windKmh = core.knotsToKilometersPerHour(windKt);
    if (windKt === 0) return "Kein Wind";
    return `${Math.abs(windKt)} kt (${Math.abs(windKmh).toFixed(1)} km/h) ${windKt > 0 ? "HW" : "TW"}`;
  }

  function createAtmosphereCardProps(atmosphere) {
    return {
      densityAltitudeFt: atmosphere.densityAltitudeFt,
      densityAltitudeWarn: atmosphere.densityAltitudeFt > 5000,
      isaDeviationText: `${core.formatSigned(atmosphere.isaDeviationC, 1)} °C`,
      isaDeviationClass: Math.abs(atmosphere.isaDeviationC) < 0.1 ? "" : atmosphere.isaDeviationC > 0 ? "warn" : "good",
    };
  }

  function createLandingSteps(inputs, result) {
    return [
      { name: "Schritt 1 - Atmosphäre", detail: `PA ${inputs.pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${inputs.oatC} °C`, value: `${core.round(result.landingRollByAtmosphereMeters)} m` },
      { name: "Schritt 2 - Masse", detail: `${core.round(result.landingRollByAtmosphereMeters)} m · ${inputs.massKg} kg`, value: `${core.round(result.landingRollByMassMeters)} m` },
      { name: "Schritt 3 - Wind", detail: `${core.round(result.landingRollByMassMeters)} m · ${formatWindLabel(inputs.windKt)}`, value: `${core.round(result.landingRollByWindMeters)} m` },
      { name: "Schritt 4 - Hindernis 15 m", detail: `${core.round(result.landingRollByWindMeters)} m -> über 15 m`, value: `${core.round(result.landingDistanceWithoutMarginMeters)} m` },
      { name: `Zuschlag ${inputs.safetyMarginPercent}% auf Rollstrecke`, detail: `+${core.round(result.landingRollMarginMeters)} m auf Roll- und Landestrecke`, value: `${result.landingRollMeters} m / ${result.landingDistanceMeters} m` },
    ];
  }

  function chartAxisPosition(value, values, pixels) {
    return core.interpolate1D(values, pixels, Math.min(values[values.length - 1], Math.max(values[0], value)));
  }

  function chartTemperatureX(value) {
    return chartAxisPosition(value, [-20, -10, 0, 10, 20, 30, 40], [212.5, 259.5, 304.5, 347.5, 391.5, 436.5, 480.5]);
  }

  function chartMassX(value) {
    return chartAxisPosition(value, [700, 750, 800, 850, 920], [729.5, 684, 638, 592, 528]);
  }

  function chartWindX(value) {
    const maximumWindKmh = value < 0 ? 20 : 40;
    return chartAxisPosition(Math.min(maximumWindKmh, Math.abs(value)), [0, 10, 20, 30, 40], [776, 821, 866, 911, 956]);
  }

  function chartRollY(value) {
    return chartAxisPosition(value, [0, 100, 200, 300, 400], [849, 752, 655, 560, 466]);
  }

  function chartWindPoint(windKmh, incomingRollMeters, correctedRollMeters) {
    if (windKmh > 0 && correctedRollMeters <= 0 && incomingRollMeters > 0) {
      const rawCorrectionAtMaximumHeadwind = core.lookup2D(
        data.landing.landingRollFromHeadwind,
        incomingRollMeters,
        40
      );
      const zeroCrossingKmh = 40 * incomingRollMeters / (incomingRollMeters - rawCorrectionAtMaximumHeadwind);
      return [chartWindX(Math.min(windKmh, zeroCrossingKmh)), chartRollY(0)];
    }
    return [chartWindX(windKmh), chartRollY(correctedRollMeters)];
  }

  function chartDistanceY(value) {
    const distances = [0, 100, 200, 300, 400, 500, 600, 700, 800];
    const scanY = [895, 800, 704, 609, 514, 418, 322, 227, 132];
    return core.interpolate1D(distances, scanY, value);
  }

  function chartObstaclePoint(landingRollMeters, landingDistanceMeters) {
    const rawEntryRollMeters = core.interpolate1D(
      data.landing.landingDistanceOver15m.landingDistanceMeters,
      data.landing.landingDistanceOver15m.landingRollBreakpoints,
      landingDistanceMeters
    );
    if (rawEntryRollMeters < 0) {
      const entryX = core.interpolate1D(
        [rawEntryRollMeters, landingDistanceMeters],
        [1000, 1178],
        0
      );
      return [
        [entryX, chartRollY(0)],
        [1178, chartDistanceY(landingDistanceMeters)],
      ];
    }
    return [
      [1000, chartRollY(landingRollMeters)],
      [1178, chartDistanceY(landingDistanceMeters)],
    ];
  }

  function createChartPoints(inputs, result) {
    const windKmh = core.knotsToKilometersPerHour(inputs.windKt);
    const windPoint = chartWindPoint(windKmh, result.landingRollByMassChartMeters, result.landingRollByWindChartMeters);
    const obstaclePoints = chartObstaclePoint(result.landingRollByWindChartMeters, result.landingDistanceWithoutMarginMeters);
    return [
      [chartTemperatureX(inputs.oatC), 849],
      [chartTemperatureX(inputs.oatC), chartRollY(result.landingRollByAtmosphereChartMeters)],
      [528, chartRollY(result.landingRollByAtmosphereChartMeters)],
      [chartMassX(inputs.massKg), chartRollY(result.landingRollByMassChartMeters)],
      [776, chartRollY(result.landingRollByMassChartMeters)],
      windPoint,
      [1000, chartRollY(result.landingRollByWindChartMeters)],
      ...obstaclePoints,
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

  function drawExportField(context, label, value, x, y, width, options = {}) {
    const disabled = options.disabled === true;
    context.fillStyle = disabled ? "#edf0f2" : "#f4f8fb";
    context.strokeStyle = disabled ? "#c6cdd3" : "#d8e3eb";
    context.lineWidth = 1;
    context.setLineDash(disabled ? [6, 4] : []);
    context.beginPath();
    context.roundRect(x, y, width, 68, 10);
    context.fill();
    context.stroke();
    context.setLineDash([]);
    drawExportText(context, label.toUpperCase(), x + 14, y + 23, { size: 13, weight: 700, color: disabled ? "#7d878f" : "#607487" });
    drawExportText(context, value, x + 14, y + 52, { size: disabled ? 17 : 20, weight: 700, color: disabled ? "#7d878f" : "#152235" });
  }

  function utcTimestamp(date) {
    return date.toISOString().replace("T", " ").replace(/:/g, "-").slice(0, 19);
  }

  function utcFileTimestamp(date) {
    return date.toISOString().replace("T", " ").replace(/:/g, "-").slice(0, 19);
  }

  function drawExportLegend(context, x, y) {
    context.strokeStyle = "#e90000";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 42, y);
    context.stroke();
    context.beginPath();
    context.fillStyle = "#e90000";
    context.arc(x + 21, y, 6, 0, Math.PI * 2);
    context.fill();
    drawExportText(context, "Rechenweg ohne Zuschlag", x + 56, y + 7, { size: 17, weight: 600 });

    context.beginPath();
    context.fillStyle = "#00b3ff";
    context.strokeStyle = "#111111";
    context.lineWidth = 3;
    context.arc(x + 650, y, 7, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    drawExportText(context, "Landestrecke über 15 m inkl. Zuschlag", x + 670, y + 7, { size: 17, weight: 600 });
  }

  async function exportChartImage(inputs, result, exportContext, button) {
    button.disabled = true;
    button.textContent = "Erzeuge PNG…";

    try {
      const exportDate = new Date();
      const timestamp = utcTimestamp(exportDate);
      const headerHeight = 745;
      const canvas = document.createElement("canvas");
      canvas.width = 1505;
      canvas.height = headerHeight + 1045;
      const context = canvas.getContext("2d");
      const image = await loadImage("assets/grob115b-landing-chart.png");
      const points = createChartPoints(inputs, result);
      const finalDistancePoint = [1178, chartDistanceY(result.landingDistanceMeters)];

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawExportText(context, `${timestamp}Z – Grob G115B Landestreckenberechnung`, 48, 54, { size: 30, weight: 700 });
      drawExportText(context, "Eingangswerte", 48, 96, { size: 19, weight: 700, color: "#006f9f" });
      if (exportContext.pressureAltitudeMode === "qnh") {
        drawExportField(context, "Elevation", `${exportContext.elevationFt} ft`, 48, 112, 338);
        drawExportField(context, "QNH", `${exportContext.qnhHpa} hPa`, 402, 112, 338);
        drawExportField(context, "Druckhöhe", `${inputs.pressureAltitudeFt} ft`, 756, 112, 338);
      } else {
        drawExportField(context, "Elevation", "Nicht bereitgestellt", 48, 112, 338, { disabled: true });
        drawExportField(context, "QNH", "Nicht bereitgestellt", 402, 112, 338, { disabled: true });
        drawExportField(context, "Druckhöhe", `${inputs.pressureAltitudeFt} ft`, 756, 112, 338);
      }
      drawExportField(context, "OAT", `${inputs.oatC} °C`, 1110, 112, 302);
      drawExportField(context, "Masse", `${inputs.massKg} kg`, 48, 192, 338);
      drawExportField(context, "Wind", formatWindLabel(inputs.windKt), 402, 192, 338);
      drawExportField(context, "Zuschlag", `${inputs.safetyMarginPercent}%`, 756, 192, 338);
      drawExportText(context, "Berechnete Atmosphärenwerte", 48, 300, { size: 19, weight: 700, color: "#006f9f" });
      drawExportField(context, "Density Altitude", `${result.atmosphere.densityAltitudeFt} ft`, 48, 316, 410);
      drawExportField(context, "ISA-Abweichung", `${core.formatSigned(result.atmosphere.isaDeviationC, 1)} °C`, 474, 316, 410);
      drawExportText(context, "Ergebnis", 48, 424, { size: 19, weight: 700, color: "#006f9f" });
      drawExportField(context, "Rollstrecke ohne Zuschlag", `${core.round(result.landingRollByWindMeters)} m`, 48, 440, 664);
      drawExportField(context, "Zuschlag", `${core.round(result.landingRollMarginMeters)} m`, 728, 440, 684);
      drawExportField(context, "Rollstrecke inkl. Zuschlag", `${result.landingRollMeters} m`, 48, 520, 664);
      drawExportField(context, "Landestrecke über 15 m inkl. Zuschlag", `${result.landingDistanceMeters} m`, 728, 520, 684);
      drawExportText(
        context,
        result.warnings.length > 0 ? `Warnungen: ${result.warnings.map((warning) => warning.text).join(" · ")}` : "Warnungen: keine",
        48,
        638,
        { size: 18, weight: 600, color: result.warnings.length > 0 ? "#9a5200" : "#526274" }
      );
      drawExportLegend(context, 48, 685);

      context.drawImage(image, 0, headerHeight, 1505, 1045);
      context.save();
      context.translate(0, headerHeight);
      context.strokeStyle = "#e90000";
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
      context.stroke();
      points.slice(1).forEach(([x, y]) => {
        context.beginPath();
        context.fillStyle = "#e90000";
        context.strokeStyle = "#e90000";
        context.lineWidth = 2;
        context.arc(x, y, 6, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });
      context.beginPath();
      context.fillStyle = "#00b3ff";
      context.strokeStyle = "#111111";
      context.lineWidth = 3;
      context.arc(finalDistancePoint[0], finalDistancePoint[1], 6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();

      const blob = await canvasToBlob(canvas);
      const fileName = `${utcFileTimestamp(exportDate)}Z Grob G115B Landestreckenberechnung.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Grob G115B Landestreckenberechnung" });
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
    const finalDistancePoint = [1178, chartDistanceY(result.landingDistanceMeters)];
    const svg = svgElement("svg", {
      class: "takeoff-chart-overlay",
      viewBox: "0 0 1505 1045",
      "aria-label": "Grafischer Rechenweg im originalen Landestreckendiagramm",
    });
    svg.append(svgElement("polyline", {
      class: "takeoff-chart-path",
      points: points.map((point) => point.join(",")).join(" "),
    }));
    points.slice(1).forEach(([x, y], index) => {
      svg.append(svgElement("circle", { class: "takeoff-chart-point", cx: x, cy: y, r: index === points.length - 2 ? 5 : 5 }));
    });
    svg.append(svgElement("circle", {
      class: "takeoff-chart-final-point",
      cx: finalDistancePoint[0],
      cy: finalDistancePoint[1],
      r: 5,
    }));

    const chartStage = ui.el(
      "div",
      { className: "takeoff-chart-stage" },
      ui.el("img", {
        className: "takeoff-chart-image",
        attrs: {
          src: "assets/grob115b-landing-chart.png",
          alt: "Originales Flughandbuchdiagramm Bild 5.3.15 Landestrecke",
          width: "1505",
          height: "1045",
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
        ui.el("span", { className: "takeoff-chart-key", text: "Unbezuschlagter Weg im Originaldiagramm" }),
        ui.el("span", {
          text: `Rollstrecke: ${core.round(result.landingRollByWindMeters)} m`,
        }),
        ui.el("span", {
          text: `Landestrecke über 15 m: ${core.round(result.landingDistanceWithoutMarginMeters)} m`,
        }),
        ui.el("span", {
          text: `Zuschlag: +${core.round(result.landingRollMarginMeters)} m`,
        }),
        ui.el("span", { className: "takeoff-chart-margin-key", text: `Landestrecke über 15 m inkl. Zuschlag: ${result.landingDistanceMeters} m` })
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
      ui.createContextCard({
        atmosphere: createAtmosphereCardProps(result.atmosphere),
        conditions: result.conditions,
        warnings: result.warnings,
      }),
      ui.createPipelineCard(createLandingSteps(inputs, result)),
      ui.createGridCard("Ergebnis", "result-grid", [
        ui.createMetricItem({ label: "Landing Roll · Landerollstrecke", value: result.landingRollMeters, unit: "m" }),
        ui.createMetricItem({ label: "Landing Distance · Landestrecke über 15 m", value: result.landingDistanceMeters, unit: "m" }),
      ]),
      ui.createGridCard("Anfluggeschwindigkeiten", "speed-grid", [
        ui.createMetricItem({
          className: "speed-item",
          labelClassName: "speed-item-label",
          valueClassName: "speed-item-value",
          subtextClassName: "speed-item-sub",
          label: ui.el("span", {}, ui.speedSymbol("APP"), " · Approach"),
          value: core.kilometersPerHourToKnots(result.approachSpeedKmh).toFixed(1),
          unit: "kt",
          speedType: "IAS",
          subtext: `${result.approachSpeedKmh.toFixed(0)} km/h`,
        }),
        ui.createMetricItem({
          className: "speed-item",
          labelClassName: "speed-item-label",
          valueClassName: "speed-item-value",
          subtextClassName: "speed-item-sub",
          label: ui.el("span", {}, ui.speedSymbol("REF"), " · 1.3 × ", ui.speedSymbol("S0")),
          value: core.kilometersPerHourToKnots(result.referenceSpeedKmh).toFixed(1),
          unit: "kt",
          speedType: "IAS",
          subtext: `${result.referenceSpeedKmh.toFixed(0)} km/h`,
        }),
      ]),
      createChartVisualization(inputs, result, readExportContext(elements)),
    ]);
  }

  function refresh() {
    const elements = getElements();
    const inputs = readInputs(elements);
    renderResult(elements, inputs, calculators.calculateLanding(inputs));
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
