(function () {
  const { calculators, core, ui } = window.G115B;
  const DEFAULT_ELEVATION_FT = 0;
  const DEFAULT_PRESSURE_ALTITUDE_FT = 0;
  const DEFAULT_QNH_HPA = 1013;
  const DEFAULT_OAT_C = 15;
  const DEFAULT_MASS_KG = 920;
  const DEFAULT_SLOPE_PERCENT = 0;
  const DEFAULT_WIND_KT = 0;
  const DEFAULT_SAFETY_MARGIN_PERCENT = 40;

  function readNumberValue(element, defaultValue) {
    if (!element || element.value === "") return defaultValue;
    return Number.parseFloat(element.value);
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

  function createLandingSteps(inputs, result) {
    return [
      { name: "Schritt 1 - Atmosphaere", detail: `PA ${inputs.pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${inputs.oatC} °C`, value: `${core.round(result.landingRollByAtmosphereMeters)} m` },
      { name: "Schritt 2 - Masse", detail: `${core.round(result.landingRollByAtmosphereMeters)} m · ${inputs.massKg} kg`, value: `${core.round(result.landingRollByMassMeters)} m` },
      { name: "Schritt 3 - Slope", detail: `${core.round(result.landingRollByMassMeters)} m · ${formatSlopeLabel(inputs.slopePercent)}`, value: `${core.round(result.landingRollBySlopeMeters)} m` },
      { name: "Schritt 4 - Wind", detail: `${core.round(result.landingRollBySlopeMeters)} m · ${formatWindLabel(inputs.windKt)}`, value: `${core.round(result.landingRollByWindMeters)} m` },
      { name: `Zuschlag ${inputs.safetyMarginPercent}%`, detail: `${core.round(result.landingRollByWindMeters)} m × ${(1 + inputs.safetyMarginPercent / 100).toFixed(2)}`, value: `${result.landingRollMeters} m` },
      { name: "Schritt 5 - Hindernis 15 m", detail: `${result.landingRollMeters} m -> ueber 15 m`, value: `${result.landingDistanceMeters} m` },
    ];
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
      ui.createWarnings(result.warnings),
      ui.createContextCard({
        atmosphere: createAtmosphereCardProps(result.atmosphere),
        conditions: result.conditions,
      }),
      ui.createPipelineCard(createLandingSteps(inputs, result)),
      ui.createGridCard("Ergebnis", "result-grid", [
        ui.createMetricItem({ label: "Landing Roll · Landerollstrecke", value: result.landingRollMeters, unit: "m" }),
        ui.createMetricItem({ label: "Landing Distance · Landestrecke", value: result.landingDistanceMeters, unit: "m" }),
      ]),
      ui.createGridCard("Anfluggeschwindigkeit VAPP", "speed-grid", [
        ui.createMetricItem({
          className: "speed-item",
          labelClassName: "speed-item-label",
          valueClassName: "speed-item-value",
          subtextClassName: "speed-item-sub",
          label: "VAPP IAS",
          value: core.kilometersPerHourToKnots(result.approachSpeedKmh).toFixed(1),
          unit: "kt",
          subtext: `${result.approachSpeedKmh.toFixed(0)} km/h`,
        }),
      ]),
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
