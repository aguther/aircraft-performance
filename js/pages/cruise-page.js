(function () {
  const { calculators, core, ui } = window.G115B;
  const DEFAULT_ALTITUDE_FT = 4500;
  const DEFAULT_FLIGHT_LEVEL = 45;
  const DEFAULT_DENSITY_ALTITUDE_FT = 4500;
  const DEFAULT_QNH_HPA = 1013;
  const DEFAULT_OAT_C = 6;
  const DEFAULT_POWER_PERCENT = 65;
  let currentMode = "alt";

  function readNumberValue(element, defaultValue) {
    if (!element || element.value === "") return defaultValue;
    return Number.parseFloat(element.value);
  }

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
        readNumberValue(elements.altitude, DEFAULT_ALTITUDE_FT),
        readNumberValue(elements.qnh, DEFAULT_QNH_HPA)
      );
    }
    if (currentMode === "fl") {
      return core.flightLevelToFeet(readNumberValue(elements.flightLevel, DEFAULT_FLIGHT_LEVEL));
    }
    return null;
  }

  function readInputs(elements) {
    const powerPercent = readNumberValue(elements.power, DEFAULT_POWER_PERCENT);
    if (currentMode === "da") {
      return {
        mode: currentMode,
        densityAltitudeFt: readNumberValue(elements.densityAltitudeDirect, DEFAULT_DENSITY_ALTITUDE_FT),
        powerPercent,
      };
    }

    const pressureAltitudeFt = resolvePressureAltitudeFt(elements);
    const oatC = readNumberValue(elements.oat, DEFAULT_OAT_C);
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
        `Ergebnis - ${result.powerLabel} Leistung · DA ${inputs.densityAltitudeFt.toLocaleString("de-DE")} ft`,
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
    elements.oatField.style.display = requiresOat ? "" : "none";
    elements.densityAltitudeBox.style.display = requiresOat ? "" : "none";
    ui.markResponsiveFields();
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
