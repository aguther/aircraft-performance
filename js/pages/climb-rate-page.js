(function () {
  const { calculators, core, ui } = window.G115B;
  const DEFAULT_ALTITUDE_FT = 4500;
  const DEFAULT_FLIGHT_LEVEL = 45;
  const DEFAULT_DENSITY_ALTITUDE_FT = 4500;
  const DEFAULT_QNH_HPA = 1013;
  const DEFAULT_OAT_C = 6;
  const DEFAULT_MASS_KG = 920;
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
      mass: document.getElementById("mass"),
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
    const massKg = readNumberValue(elements.mass, DEFAULT_MASS_KG);
    if (currentMode === "da") {
      const densityAltitudeFt = readNumberValue(elements.densityAltitudeDirect, DEFAULT_DENSITY_ALTITUDE_FT);
      return {
        mode: currentMode,
        massKg,
        densityAltitudeFt,
        referencePressureAltitudeFt: densityAltitudeFt,
      };
    }

    const pressureAltitudeFt = resolvePressureAltitudeFt(elements);
    const oatC = readNumberValue(elements.oat, DEFAULT_OAT_C);
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
    const nodes = [ui.createWarnings(result.warnings)];

    if (inputs.mode !== "da") {
      nodes.push(
        ui.createContextCard({
          atmosphere: {
            densityAltitudeFt: inputs.densityAltitudeFt,
            densityAltitudeWarn: inputs.densityAltitudeFt > 10000,
            isaDeviationText: `${core.formatSigned(inputs.isaDeviationC, 1)} °C`,
            isaDeviationClass: Math.abs(inputs.isaDeviationC) < 0.1 ? "" : inputs.isaDeviationC > 0 ? "warn" : "good",
          },
          conditions: result.conditions,
        })
      );
    } else {
      nodes.push(ui.createConditionsCard(result.conditions));
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
          speedType: "IAS",
          subtext: `${Math.round(result.climbSpeedKmh)} km/h`,
        }),
      ])
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
