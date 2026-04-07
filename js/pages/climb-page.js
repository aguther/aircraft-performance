(function () {
  const { calculators, core, ui } = window.G115B;
  const legModes = { from: "alt", to: "alt" };

  function getElements() {
    return {
      resultRoot: document.getElementById("rp"),
      pageLayout: document.querySelector(".page-layout"),
    };
  }

  function getLegElements(whichLeg) {
    return {
      altitude: document.getElementById(`${whichLeg}-alt`),
      qnh: document.getElementById(`${whichLeg}-qnh`),
      flightLevel: document.getElementById(`${whichLeg}-fl`),
      densityAltitudeDirect: document.getElementById(`${whichLeg}-da-direct`),
      oat: document.getElementById(`${whichLeg}-oat`),
      densityAltitudeValue: document.getElementById(`${whichLeg}-da-val`),
      oatField: document.getElementById(`${whichLeg}-oat-field`),
      densityAltitudeBox: document.getElementById(`${whichLeg}-da-box`),
    };
  }

  function readLegDensityAltitudeFt(whichLeg) {
    const mode = legModes[whichLeg];
    const elements = getLegElements(whichLeg);
    if (mode === "da") {
      return Number.parseFloat(elements.densityAltitudeDirect.value) || 0;
    }

    let pressureAltitudeFt;
    if (mode === "alt") {
      pressureAltitudeFt = core.pressureAltitudeFromQnh(
        Number.parseFloat(elements.altitude.value) || 0,
        Number.parseFloat(elements.qnh.value) || 1013
      );
    } else {
      pressureAltitudeFt = core.flightLevelToFeet(Number.parseFloat(elements.flightLevel.value) || 0);
    }

    const oatValue = elements.oat.value;
    const oatC = oatValue === "" ? 15 : Number.parseFloat(oatValue);
    const atmosphere = core.densityAltitude(pressureAltitudeFt, oatC);
    elements.densityAltitudeValue.textContent = `${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft`;
    return atmosphere.densityAltitudeFt;
  }

  function renderResult(elements, result, inputs) {
    if (result.error) {
      ui.replaceContent(elements.resultRoot, [ui.createDisclaimerCard(), ui.createWarnings([result.error])]);
      return;
    }

    const basisCard = ui.createCard(
      "Berechnungsbasis",
      ui.el(
        "div",
        { className: "climb-cols" },
        ui.el(
          "div",
          { className: "atmos-item" },
          ui.el("div", { className: "atmos-item-label", text: "Start DA" }),
          ui.el("div", { className: "atmos-item-value", text: `${inputs.departureDensityAltitudeFt.toLocaleString("de-DE")} ft` }),
          ui.el("div", {
            text: `Zeit kum.: ${result.departureCumulative.timeMinutes.toFixed(1)} min · Kraft.: ${result.departureCumulative.fuelLiters.toFixed(1)} l · Str.: ${result.departureCumulative.distanceKm.toFixed(1)} km`,
            style: { fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" },
          })
        ),
        ui.el("div", { className: "climb-arrow", text: "→" }),
        ui.el(
          "div",
          { className: "atmos-item" },
          ui.el("div", { className: "atmos-item-label", text: "Ziel DA" }),
          ui.el("div", { className: "atmos-item-value", text: `${inputs.destinationDensityAltitudeFt.toLocaleString("de-DE")} ft` }),
          ui.el("div", {
            text: `Zeit kum.: ${result.destinationCumulative.timeMinutes.toFixed(1)} min · Kraft.: ${result.destinationCumulative.fuelLiters.toFixed(1)} l · Str.: ${result.destinationCumulative.distanceKm.toFixed(1)} km`,
            style: { fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" },
          })
        )
      )
    );

    ui.replaceContent(elements.resultRoot, [
      ui.createDisclaimerCard(),
      basisCard,
      ui.createGridCard(
        `Ergebnis - ${inputs.departureDensityAltitudeFt.toLocaleString("de-DE")} -> ${inputs.destinationDensityAltitudeFt.toLocaleString("de-DE")} ft DA`,
        "result-grid",
        [
          ui.createMetricItem({ label: "Steigzeit · Climb Time", value: result.climbTimeMinutes.toFixed(1), unit: "min", valueStyle: { fontSize: "2.2rem" } }),
          ui.createMetricItem({ label: "Kraftstoff · Fuel", value: result.climbFuelLiters.toFixed(1), unit: "l", valueStyle: { fontSize: "2.2rem" } }),
          ui.createMetricItem({ label: "Strecke · Distance", value: result.climbDistanceNm.toFixed(1), unit: "nm", subtext: `${result.climbDistanceKm.toFixed(1)} km`, valueStyle: { fontSize: "2.2rem" } }),
        ]
      ),
      ui.createConditionsCard(result.conditions),
    ]);
  }

  function refresh() {
    const elements = getElements();
    const inputs = {
      departureDensityAltitudeFt: readLegDensityAltitudeFt("from"),
      destinationDensityAltitudeFt: readLegDensityAltitudeFt("to"),
    };
    renderResult(elements, calculators.calculateClimb(inputs), inputs);
  }

  function setLeg(whichLeg, mode) {
    legModes[whichLeg] = mode;
    ["alt", "fl", "da"].forEach((key) => {
      document.getElementById(`${whichLeg}-mode-${key}`).style.display = key === mode ? "flex" : "none";
      document.getElementById(`mode-${whichLeg}-${key}-btn`).classList.toggle("active", key === mode);
    });
    const legElements = getLegElements(whichLeg);
    const requiresOat = mode !== "da";
    legElements.oatField.style.display = requiresOat ? "flex" : "none";
    legElements.densityAltitudeBox.style.display = requiresOat ? "flex" : "none";
    refresh();
  }

  function calcLeg() {
    refresh();
  }

  window.setLeg = setLeg;
  window.calcLeg = calcLeg;

  document.addEventListener("DOMContentLoaded", () => {
    const elements = getElements();
    elements.pageLayout.addEventListener("input", refresh);
    refresh();
  });
})();
