(function () {
  const { calculators, core, ui } = window.G115B;

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
      Number.parseFloat(elements.elevation.value) || 0,
      Number.parseFloat(elements.qnh.value) || 1013
    );
    elements.pressureAltitudeValue.textContent = `${pressureAltitudeFt.toLocaleString("de-DE")} ft`;
    elements.pressureAltitude.value = pressureAltitudeFt;
  }

  function readInputs(elements) {
    const oatValue = elements.oat.value;
    return {
      pressureAltitudeFt: Number.parseFloat(elements.pressureAltitude.value) || 0,
      oatC: oatValue === "" ? 15 : Number.parseFloat(oatValue),
      massKg: Number.parseFloat(elements.mass.value) || 920,
      slopePercent: Number.parseFloat(elements.slope.value) || 0,
      windKt: Number.parseFloat(elements.wind.value) || 0,
      safetyMarginPercent: Number.parseFloat(elements.safetyMargin.value) || 0,
    };
  }

  function renderResult(elements, inputs, result) {
    ui.replaceContent(elements.resultRoot, [
      ui.createDisclaimerCard(),
      ui.createWarnings(result.warnings),
      ui.createAtmosphereCard({
        densityAltitudeFt: result.atmosphere.densityAltitudeFt,
        densityAltitudeWarn: result.atmosphereDisplay.densityAltitudeWarn,
        isaDeviationText: result.atmosphereDisplay.isaDeviationText,
        isaDeviationClass: result.atmosphereDisplay.isaDeviationClass,
      }),
      ui.createPipelineCard(result.steps),
      ui.createGridCard("Ergebnis", "result-grid", [
        ui.createMetricItem({ label: "Startrollstrecke · Ground Roll", value: result.results.groundRollMeters, unit: "m" }),
        ui.createMetricItem({ label: "Startstrecke · Takeoff Distance", value: result.results.takeoffDistanceMeters, unit: "m" }),
      ]),
      ui.createGridCard("Geschwindigkeiten", "speed-grid", [
        ui.createMetricItem({
          className: "speed-item",
          labelClassName: "speed-item-label",
          valueClassName: "speed-item-value",
          subtextClassName: "speed-item-sub",
          label: "VR · Rotate",
          value: core.kilometersPerHourToKnots(result.speeds.rotateSpeedKmh).toFixed(1),
          unit: "kt",
          subtext: `${result.speeds.rotateSpeedKmh.toFixed(0)} km/h IAS`,
        }),
        ui.createMetricItem({
          className: "speed-item",
          labelClassName: "speed-item-label",
          valueClassName: "speed-item-value",
          subtextClassName: "speed-item-sub",
          label: "Geschw. 15 m Hoehe",
          value: core.kilometersPerHourToKnots(result.speeds.speedAt15mKmh).toFixed(1),
          unit: "kt",
          subtext: `${result.speeds.speedAt15mKmh.toFixed(0)} km/h IAS`,
        }),
      ]),
      ui.createConditionsCard(result.conditions),
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
