(function () {
  const { calculators, ui } = window.G115B;
  let currentPower = "leerlauf";
  let currentFlaps = 40;

  function getElements() {
    return {
      mass: document.getElementById("mass"),
      resultRoot: document.getElementById("rp"),
      sidebar: document.querySelector(".sidebar"),
    };
  }

  function readInputs(elements) {
    return {
      massKg: Number.parseFloat(elements.mass.value) || 920,
      powerMode: currentPower,
      flapsDegrees: currentFlaps,
    };
  }

  function renderResult(elements, inputs, result) {
    ui.replaceContent(elements.resultRoot, [
      ui.createDisclaimerCard(),
      ui.createConditionsCard(result.conditions),
      ui.createCard(
        `Ergebnis - ${inputs.massKg} kg · ${inputs.powerMode === "leerlauf" ? "Leerlauf" : "Vollast"} · Klappen ${inputs.flapsDegrees}°`,
        ui.el(
          "div",
          { className: "result-grid", style: { gridTemplateColumns: "1fr" } },
          ui.createMetricItem({
            label: `Überziehgeschwindigkeit · ${result.stallLabel}`,
            value: result.stallSpeedKt.toFixed(1),
            unit: "kt",
            subtext: `${result.stallSpeedKmh.toFixed(0)} km/h IAS`,
          })
        )
      ),
    ]);
  }

  function refresh() {
    const elements = getElements();
    const inputs = readInputs(elements);
    renderResult(elements, inputs, calculators.calculateStall(inputs));
  }

  function setPower(powerMode) {
    currentPower = powerMode;
    ["leerlauf", "vollast"].forEach((key) => {
      document.getElementById(`mode-${key}-btn`).classList.toggle("active", key === powerMode);
    });
    refresh();
  }

  function setFlaps(flapsDegrees) {
    currentFlaps = flapsDegrees;
    [0, 12, 40].forEach((key) => {
      document.getElementById(`mode-f${key}-btn`).classList.toggle("active", key === flapsDegrees);
    });
    refresh();
  }

  window.setPower = setPower;
  window.setFlaps = setFlaps;

  document.addEventListener("DOMContentLoaded", () => {
    const elements = getElements();
    elements.sidebar.addEventListener("input", refresh);
    refresh();
  });
})();
