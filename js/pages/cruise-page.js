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
      power: document.getElementById("pwr"),
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
    const powerPercent = Number.parseFloat(elements.power.value) || 65;
    if (currentMode === "da") {
      return {
        mode: currentMode,
        densityAltitudeFt: Number.parseFloat(elements.densityAltitudeDirect.value) || 0,
        powerPercent,
      };
    }

    const pressureAltitudeFt = resolvePressureAltitudeFt(elements);
    const oatValue = elements.oat.value;
    const oatC = oatValue === "" ? 15 : Number.parseFloat(oatValue);
    const atmosphere = core.densityAltitude(pressureAltitudeFt, oatC);

    return {
      mode: currentMode,
      pressureAltitudeFt,
      oatC,
      densityAltitudeFt: atmosphere.densityAltitudeFt,
      isaDeviationC: atmosphere.isaDeviationC,
      powerPercent,
    };
  }

  function renderResult(elements, inputs, result) {
    const nodes = [ui.createDisclaimerCard()];

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
      ui.createGridCard(
        `Ergebnis - ${result.displayPowerLabel} Leistung · DA ${inputs.densityAltitudeFt.toLocaleString("de-DE")} ft`,
        "result-grid",
        [
          ui.createMetricItem({ label: "Drehzahl · POH 5.3.11", value: Math.round(result.rpm), unit: "rpm" }),
          ui.createMetricItem({
            label: "Fuel Flow · POH 5.3.10",
            value: result.fuelFlowLitersPerHour.toFixed(1),
            unit: "l/h",
            subtext: `${result.nauticalMilesPerLiter.toFixed(2)} nm/l`,
          }),
          ui.createMetricItem({
            label: "TAS · POH 5.3.12",
            value: result.tasKt.toFixed(1),
            unit: "kt",
            subtext: `${Math.round(result.tasKmh)} km/h`,
          }),
        ]
      )
    );

    ui.replaceContent(elements.resultRoot, nodes);
  }

  function refresh() {
    const elements = getElements();
    const inputs = readInputs(elements);
    if (inputs.mode !== "da") {
      elements.densityAltitudeValue.textContent = `${inputs.densityAltitudeFt.toLocaleString("de-DE")} ft`;
    }
    renderResult(elements, inputs, calculators.calculateCruise(inputs));
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
