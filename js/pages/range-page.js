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
      powerPercent,
    };
  }

  function renderResult(elements, inputs, result) {
    const nodes = [ui.createDisclaimerCard(), ui.createWarnings(result.warnings)];

    nodes.push(
      ui.createCard(
        "Grundlagen",
        ui.el("div", { className: "context-card-body" }, [
          inputs.mode !== "da"
            ? ui.el(
                "div",
                { className: "context-card-block" },
                ui.el(
                  "div",
                  { className: "atmos-grid" },
                  ui.el(
                    "div",
                    { className: "atmos-item" },
                    ui.el("div", { className: "atmos-item-label", text: "Density Altitude" }),
                    ui.el("div", {
                      className: `atmos-item-value${inputs.densityAltitudeFt > 10000 ? " warn" : ""}`,
                      text: `${inputs.densityAltitudeFt.toLocaleString("de-DE")} ft`,
                    })
                  )
                )
              )
            : null,
          ui.el("div", { className: "context-card-block" }, [
            inputs.mode !== "da" ? ui.el("div", { className: "context-divider", text: "Hinweis" }) : null,
            ui.el("div", {
              className: "result-item-sub",
              text: result.note,
              style: { fontSize: "12px", lineHeight: "1.6", color: "var(--text-sub)" },
            }),
          ]),
        ])
      )
    );

    nodes.push(
      ui.createCard(
        `Ergebnis - ${inputs.powerPercent}% Leistung · DA ${inputs.densityAltitudeFt.toLocaleString("de-DE")} ft`,
        ui.createMetricItem({
          label: "Reichweite · Range",
          value: Math.round(result.rangeNm),
          unit: "nm",
          subtext: `${Math.round(result.rangeKm)} km`,
        })
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
    renderResult(elements, inputs, calculators.calculateRange(inputs));
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
