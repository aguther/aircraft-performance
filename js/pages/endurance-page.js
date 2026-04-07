(function () {
  const { calculators, ui } = window.G115B;

  function formatDuration(hours) {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes === 60 ? `${wholeHours + 1} Std. 0 min` : `${wholeHours} Std. ${minutes} min`;
  }

  function getElements() {
    return {
      fuel: document.getElementById("fuel"),
      power: document.getElementById("pwr"),
      resultRoot: document.getElementById("rp"),
      sidebar: document.querySelector(".sidebar"),
    };
  }

  function readInputs(elements) {
    return {
      fuelLiters: Number.parseFloat(elements.fuel.value) || 0,
      powerPercent: Number.parseFloat(elements.power.value) || 55,
    };
  }

  function renderResult(elements, inputs, result) {
    const rows = [
      ["Verbrauch", `${result.fuelFlowLitersPerHour.toFixed(1)} l/h`],
      ["Kraftstoff gesamt", `${inputs.fuelLiters.toFixed(0)} l`],
      ["Reserve (45 min)", `${result.reserveFuelLiters.toFixed(1)} l`],
      ["Nutzbarer Kraftstoff", `${result.usableFuelLiters.toFixed(1)} l`],
    ];

    ui.replaceContent(elements.resultRoot, [
      ui.createDisclaimerCard(),
      ui.createWarnings(result.warnings),
      ui.createGridCard("Ergebnis", "result-grid", [
        ui.createMetricItem({
          label: "Mit 45 min Reserve",
          value: formatDuration(result.enduranceHoursWithReserve),
          unit: "",
          valueStyle: { fontSize: "1.9rem" },
        }),
        ui.createMetricItem({
          label: "Ohne Reserve",
          value: formatDuration(result.enduranceHoursTotal),
          unit: "",
          valueStyle: { fontSize: "1.9rem" },
        }),
      ]),
      ui.createCard(
        "Aufschluesselung",
        ui.el(
          "table",
          { className: "breakdown-table" },
          rows.map(([label, value]) =>
            ui.el("tr", null, ui.el("td", { text: label }), ui.el("td", { text: value }))
          )
        )
      ),
    ]);
  }

  function refresh() {
    const elements = getElements();
    const inputs = readInputs(elements);
    renderResult(elements, inputs, calculators.calculateEndurance(inputs));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const elements = getElements();
    elements.sidebar.addEventListener("input", refresh);
    refresh();
  });
})();
