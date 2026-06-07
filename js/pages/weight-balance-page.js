(function () {
  const { calculators, core, data, ui } = window.G115B;
  const DEFAULT_AIRCRAFT = "D-EBFT";
  const DEFAULT_PILOT_MASS_KG = 85;
  const DEFAULT_COPILOT_MASS_KG = 0;
  const DEFAULT_BAGGAGE_MASS_KG = 0;
  const DEFAULT_FUEL_LITERS = 107;
  let currentAircraft = DEFAULT_AIRCRAFT;

  function readNumberValue(element, defaultValue) {
    if (!element || element.value === "") return defaultValue;
    return Number.parseFloat(element.value);
  }

  function getElements() {
    return {
      pilotMass: document.getElementById("pilot-mass"),
      copilotMass: document.getElementById("copilot-mass"),
      baggageMass: document.getElementById("baggage-mass"),
      fuelLiters: document.getElementById("fuel-liters"),
      resultRoot: document.getElementById("rp"),
      sidebar: document.querySelector(".sidebar"),
    };
  }

  function readInputs(elements) {
    return {
      aircraftName: currentAircraft,
      pilotMassKg: readNumberValue(elements.pilotMass, DEFAULT_PILOT_MASS_KG),
      copilotMassKg: readNumberValue(elements.copilotMass, DEFAULT_COPILOT_MASS_KG),
      baggageMassKg: readNumberValue(elements.baggageMass, DEFAULT_BAGGAGE_MASS_KG),
      fuelLiters: readNumberValue(elements.fuelLiters, DEFAULT_FUEL_LITERS),
    };
  }

  function formatKg(value) {
    return `${value.toFixed(1)} kg`;
  }

  function formatMoment(value) {
    return `${value.toFixed(2)} kg m`;
  }

  function createEnvelopeChart(result) {
    const envelope = data.weightBalance.envelope;
    const minMoment = Math.min(...envelope.map((point) => point.momentKgM), result.totalMomentKgM) - 8;
    const maxMoment = Math.max(...envelope.map((point) => point.momentKgM), result.totalMomentKgM) + 8;
    const minMass = Math.min(...envelope.map((point) => point.massKg), result.totalMassKg) - 14;
    const maxMass = Math.max(...envelope.map((point) => point.massKg), result.totalMassKg) + 14;
    const width = 680;
    const height = 300;
    const padding = { top: 18, right: 18, bottom: 34, left: 58 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const x = (moment) => padding.left + ((moment - minMoment) / (maxMoment - minMoment)) * plotWidth;
    const y = (mass) => padding.top + (1 - (mass - minMass) / (maxMass - minMass)) * plotHeight;
    const polygonPoints = envelope.map((point) => `${x(point.momentKgM).toFixed(1)},${y(point.massKg).toFixed(1)}`).join(" ");
    const pointX = x(result.totalMomentKgM);
    const pointY = y(result.totalMassKg);
    const massTicks = [750, 840, 920];
    const momentTicks = [150, 180, 210, 240, 270];

    return ui.el(
      "div",
      { className: "wb-chart-wrap" },
      ui.el(
        "div",
        { className: "wb-chart-axis-key" },
        ui.el("span", { text: "Masse [kg]" })
      ),
      ui.el(
        "svg",
        { className: "wb-chart", attrs: { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Weight and balance envelope" } },
        massTicks.map((tick) =>
          ui.el("line", {
            className: "wb-grid-line",
            attrs: { x1: padding.left, y1: y(tick), x2: width - padding.right, y2: y(tick) },
          })
        ),
        momentTicks.map((tick) =>
          ui.el("line", {
            className: "wb-grid-line",
            attrs: { x1: x(tick), y1: padding.top, x2: x(tick), y2: height - padding.bottom },
          })
        ),
        ui.el("polygon", { className: "wb-envelope", attrs: { points: polygonPoints } }),
        ui.el("polyline", { className: "wb-envelope-line", attrs: { points: `${polygonPoints} ${polygonPoints.split(" ")[0]}` } }),
        massTicks.map((tick) =>
          ui.el("text", { className: "wb-axis-label", attrs: { x: 16, y: y(tick) + 4 }, text: String(tick) })
        ),
        momentTicks.map((tick) =>
          ui.el("text", { className: "wb-axis-label", attrs: { x: x(tick), y: height - 16, "text-anchor": "middle" }, text: String(tick) })
        ),
        ui.el("circle", {
          className: `wb-current-point${result.withinEnvelope ? "" : " danger"}`,
          attrs: { cx: pointX.toFixed(1), cy: pointY.toFixed(1), r: 6 },
        })
      ),
      ui.el(
        "div",
        { className: "wb-chart-axis-footer" },
        ui.el("span", { text: "Moment [kg m]" })
      )
    );
  }

  function createBreakdownTable(result) {
    const rows = result.stations.map((station) =>
      ui.el(
        "tr",
        {},
        ui.el("td", { text: station.label }),
        ui.el("td", { text: formatKg(station.massKg) }),
        ui.el("td", { text: `${station.armM.toFixed(4)} m` }),
        ui.el("td", { text: formatMoment(station.momentKgM) })
      )
    );

    rows.push(
      ui.el(
        "tr",
        { className: "wb-total-row" },
        ui.el("td", { text: "Gesamt" }),
        ui.el("td", { text: formatKg(result.totalMassKg) }),
        ui.el("td", { text: `${result.cgArmM.toFixed(4)} m` }),
        ui.el("td", { text: formatMoment(result.totalMomentKgM) })
      )
    );

    return ui.el(
      "table",
      { className: "breakdown-table wb-breakdown" },
      ui.el(
        "thead",
        {},
        ui.el(
          "tr",
          {},
          ui.el("th", { text: "Wert" }),
          ui.el("th", { text: "Masse" }),
          ui.el("th", { text: "Arm" }),
          ui.el("th", { text: "Moment" })
        )
      ),
      ui.el(
        "tbody",
        {},
        rows
      )
    );
  }

  function createSpeedMetric(label, speedKmh) {
    return ui.createMetricItem({
      label,
      value: core.kilometersPerHourToKnots(speedKmh).toFixed(1),
      unit: "kt",
      subtext: `${Math.round(speedKmh)} km/h IAS`,
    });
  }

  function createInlineWarnings(warnings) {
    if (!warnings || warnings.length === 0) return null;
    return ui.el(
      "div",
      { className: "wb-inline-warnings" },
      warnings.map((warning) =>
        ui.el("div", {
          className: `wb-inline-warning${warning.danger ? " danger" : ""}`,
          text: warning.text,
        })
      )
    );
  }

  function createWeightBalanceCard(result) {
    return ui.createCard(
      "Weight & Balance",
      ui.el(
        "div",
        { className: "wb-summary" },
        ui.el(
          "div",
          { className: "result-grid" },
          ui.createMetricItem({
            label: "Masse",
            value: result.totalMassKg.toFixed(1),
            unit: "kg",
            subtext: result.withinEnvelope ? "Innerhalb Envelope" : "Ausserhalb Envelope",
            className: result.withinEnvelope ? "result-item" : "result-item danger",
          }),
          ui.createMetricItem({
            label: "Moment",
            value: result.totalMomentKgM.toFixed(2),
            unit: "kg m",
            subtext: `Arm ${result.cgArmM.toFixed(4)} m`,
            className: result.withinEnvelope ? "result-item" : "result-item danger",
          })
        ),
        createInlineWarnings(result.warnings)
      )
    );
  }

  function renderResult(elements, result) {
    const nodes = [
      ui.createDisclaimerCard(),
      createWeightBalanceCard(result),
      ui.createCard("Envelope", createEnvelopeChart(result)),
      ui.createGridCard("Geschwindigkeiten", "speed-grid", [
        createSpeedMetric("VR Rotate IAS", result.speeds.rotateSpeedKmh),
        createSpeedMetric("Geschw. 15 m Höhe", result.speeds.speedAt15mKmh),
        createSpeedMetric("VAPP IAS", result.speeds.approachSpeedKmh),
        createSpeedMetric("VS0 Leerlauf 40°", result.speeds.stallIdleFlaps40Kmh),
      ]),
      ui.createCard("Beladung", createBreakdownTable(result)),
      ui.createConditionsCard(result.conditions),
    ];

    ui.replaceContent(elements.resultRoot, nodes);
  }

  function refresh() {
    const elements = getElements();
    renderResult(elements, calculators.calculateWeightBalance(readInputs(elements)));
  }

  function setAircraft(aircraftName) {
    currentAircraft = aircraftName;
    data.weightBalance.emptyAircraft.forEach((aircraft) => {
      const button = document.getElementById(`aircraft-${aircraft.name}`);
      if (button) button.classList.toggle("active", aircraft.name === aircraftName);
    });
    refresh();
  }

  window.setAircraft = setAircraft;

  document.addEventListener("DOMContentLoaded", () => {
    const elements = getElements();
    elements.sidebar.addEventListener("input", refresh);
    refresh();
  });
})();
