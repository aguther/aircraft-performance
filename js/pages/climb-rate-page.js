(function () {
  const { calculators, core, ui } = window.G115B;
  let currentMode = "alt";

  function getElements() {
    return {
      altitude: document.getElementById("alt"),
      qnh: document.getElementById("qnh"),
      flightLevel: document.getElementById("fl"),
      densityAltitudeDirect: document.getElementById("da-direct"),
      oat: document.getElementById("oat"),
      densityAltitudeValue: document.getElementById("da-val"),
      oatField: document.getElementById("oat-field"),
      densityAltitudeBox: document.getElementById("da-box"),
      mass: document.getElementById("mass"),
      resultRoot: document.getElementById("rp"),
      sidebar: document.querySelector(".sidebar"),
    };
  }

  function resolvePressureAltitudeFt(elements) {
    if (currentMode === "alt") {
      return core.pressureAltitudeFromQnh(
        Number.parseFloat(elements.altitude.value) || 0,
        Number.parseFloat(elements.qnh.value) || 1013
      );
    }
    if (currentMode === "fl") {
      return core.flightLevelToFeet(Number.parseFloat(elements.flightLevel.value) || 0);
    }
    return null;
  }

  function readInputs(elements) {
    const massKg = Number.parseFloat(elements.mass.value) || 920;
    if (currentMode === "da") {
      const densityAltitudeFt = Number.parseFloat(elements.densityAltitudeDirect.value) || 0;
      return {
        mode: currentMode,
        massKg,
        densityAltitudeFt,
        referencePressureAltitudeFt: densityAltitudeFt,
      };
    }

    const pressureAltitudeFt = resolvePressureAltitudeFt(elements);
    const oatValue = elements.oat.value;
    const oatC = oatValue === "" ? 15 : Number.parseFloat(oatValue);
    const atmosphere = core.densityAltitude(pressureAltitudeFt, oatC);
    return {
      mode: currentMode,
      massKg,
      pressureAltitudeFt,
      oatC,
      densityAltitudeFt: atmosphere.densityAltitudeFt,
      isaDeviationC: atmosphere.isaDeviationC,
      referencePressureAltitudeFt: pressureAltitudeFt,
    };
  }

  function renderResult(elements, inputs, result) {
    const nodes = [ui.createDisclaimerCard(), ui.createWarnings(result.warnings)];

    if (inputs.mode !== "da") {
      nodes.push(
        ui.createAtmosphereCard({
          densityAltitudeFt: inputs.densityAltitudeFt,
          densityAltitudeWarn: inputs.densityAltitudeFt > 10000,
          isaDeviationText: `${core.formatSigned(inputs.isaDeviationC, 1)} °C`,
          isaDeviationClass: Math.abs(inputs.isaDeviationC) < 0.1 ? "" : inputs.isaDeviationC > 0 ? "warn" : "good",
        })
      );
    }

    nodes.push(
      ui.createGridCard(`Ergebnis - ${inputs.massKg} kg · DA ${inputs.densityAltitudeFt.toLocaleString("de-DE")} ft`, "result-grid", [
        ui.createMetricItem({
          label: "Steigrate · Rate of Climb",
          value: Math.round(result.climbRateFpm),
          unit: "ft/min",
          subtext: `${result.climbRateMs.toFixed(1)} m/s`,
        }),
        ui.createMetricItem({
          label: "VY · Climb Speed",
          labelClassName: "result-item-label",
          value: core.kilometersPerHourToKnots(result.climbSpeedKmh).toFixed(1),
          unit: "kt",
          subtext: `${Math.round(result.climbSpeedKmh)} km/h IAS`,
        }),
      ]),
      ui.createConditionsCard(result.conditions)
    );

    ui.replaceContent(elements.resultRoot, nodes);
  }

  function refresh() {
    const elements = getElements();
    const inputs = readInputs(elements);
    if (inputs.mode !== "da") {
      elements.densityAltitudeValue.textContent = `${inputs.densityAltitudeFt.toLocaleString("de-DE")} ft`;
    }
    renderResult(elements, inputs, calculators.calculateClimbRate(inputs));
  }

  function setMode(mode) {
    currentMode = mode;
    ["alt", "fl", "da"].forEach((key) => {
      document.getElementById(`mode-${key}`).style.display = key === mode ? "flex" : "none";
      document.getElementById(`mode-${key}-btn`).classList.toggle("active", key === mode);
    });
    const elements = getElements();
    const requiresOat = mode !== "da";
    elements.oatField.style.display = requiresOat ? "flex" : "none";
    elements.densityAltitudeBox.style.display = requiresOat ? "flex" : "none";
    refresh();
  }

  function calcDA() {
    refresh();
  }

  window.setMode = setMode;
  window.calcDA = calcDA;

  document.addEventListener("DOMContentLoaded", () => {
    const elements = getElements();
    elements.sidebar.addEventListener("input", refresh);
    refresh();
  });
})();
