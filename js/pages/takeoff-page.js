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
    return chartX(value, 0, 1600, 820, 94);
  }

  function svgElement(tagName, attributes) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  }

  function createChartVisualization(inputs, result) {
    const windKmh = core.knotsToKilometersPerHour(inputs.windKt);
    const points = [
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

    return ui.el(
      "div",
      { className: "card takeoff-chart-card" },
      ui.el(
        "div",
        { className: "takeoff-chart-header" },
        ui.el("div", { className: "card-title", text: "Grafische Nachvollziehbarkeit" }),
        ui.el("label", { className: "takeoff-chart-toggle" }, toggle, ui.el("span", { text: "Rechenweg" }))
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
          text: `Betrieblicher Zuschlag außerhalb des Diagramms: +${core.round(result.groundRollMarginMeters)} m`,
        })
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
      createChartVisualization(inputs, result),
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
