(function () {
  const { calculators, core, data, ui } = window.G115B;
  let currentPower = "leerlauf";
  let currentFlaps = 40;
  const TRACE_COLOR = "#e90000";

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

  function svgElement(tagName, attributes) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  }

  function chartPoint(inputs) {
    const chart = data.stall.chart[inputs.powerMode === "vollast" ? "fullPower" : "idle"];
    const flapKey = `flaps${inputs.flapsDegrees}`;
    return {
      x: core.interpolate1D(data.stall.chart.massValues, chart.massPixels, inputs.massKg),
      y: core.interpolate1D(data.stall.massBreakpoints, chart.linePixels[flapKey], inputs.massKg),
      left: chart.massPixels[0],
      bottom: chart.speedPixels[0],
    };
  }

  function createOverlay(inputs) {
    const point = chartPoint(inputs);
    const svg = svgElement("svg", {
      class: "stall-chart-overlay",
      viewBox: `0 0 ${data.stall.chart.width} ${data.stall.chart.height}`,
      "aria-label": "Grafischer Rechenweg im originalen Überziehgeschwindigkeitsdiagramm",
    });
    svg.append(svgElement("polyline", {
      class: "stall-chart-path",
      points: `${point.left},${point.y} ${point.x},${point.y} ${point.x},${point.bottom}`,
      fill: "none",
      stroke: TRACE_COLOR,
      "stroke-width": 4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }));
    [[point.left, point.y], [point.x, point.y], [point.x, point.bottom]].forEach(([cx, cy]) => {
      svg.append(svgElement("circle", {
        class: "stall-chart-point",
        cx,
        cy,
        r: 5,
        fill: TRACE_COLOR,
        stroke: "#ffffff",
        "stroke-width": 0,
      }));
    });
    return svg;
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG konnte nicht erzeugt werden.")), "image/png"));
  }

  function drawExportText(context, text, x, y, options = {}) {
    context.fillStyle = options.color || "#152235";
    context.font = `${options.weight || 600} ${options.size || 24}px "Segoe UI", Arial, sans-serif`;
    context.fillText(text, x, y);
  }

  function drawExportField(context, label, value, x, y, width) {
    context.fillStyle = "#f4f8fb";
    context.strokeStyle = "#d8e3eb";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x, y, width, 72, 10);
    context.fill();
    context.stroke();
    drawExportText(context, label.toUpperCase(), x + 14, y + 24, { size: 13, weight: 700, color: "#607487" });
    drawExportText(context, value, x + 14, y + 54, { size: 20, weight: 700 });
  }

  function utcTimestamp(date) {
    return date.toISOString().replace("T", " ").replace(/:/g, "-").slice(0, 19);
  }

  async function exportChartImage(inputs, result, overlay, button) {
    button.disabled = true;
    button.textContent = "Erzeuge PNG…";
    let overlayUrl;
    try {
      const exportDate = new Date();
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 2190;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawExportText(context, `${utcTimestamp(exportDate)}Z – Grob G115B Überziehgeschwindigkeit`, 40, 54, { size: 28, weight: 700 });
      drawExportText(context, "Eingangswerte", 40, 98, { size: 18, weight: 700, color: "#006f9f" });
      drawExportField(context, "Flugmasse", `${inputs.massKg} kg`, 40, 114, 350);
      drawExportField(context, "Leistungsstellung", inputs.powerMode === "leerlauf" ? "Leerlauf" : "Vollast", 410, 114, 350);
      drawExportField(context, "Klappenstellung", `${inputs.flapsDegrees}°`, 780, 114, 380);
      drawExportText(context, "Ergebnis", 40, 226, { size: 18, weight: 700, color: "#006f9f" });
      drawExportField(context, `Überziehgeschwindigkeit · ${result.stallLabel} · IAS`, `${result.stallSpeedKt.toFixed(1)} kt / ${result.stallSpeedKmh.toFixed(1)} km/h`, 40, 242, 1120);

      const original = await loadImage("assets/grob115b-stall-chart.png");
      context.drawImage(original, 0, 350, 1200, 1751);
      const serialized = new XMLSerializer().serializeToString(overlay);
      overlayUrl = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
      context.drawImage(await loadImage(overlayUrl), 0, 350, 1200, 1751);
      drawExportText(context, `Quelle: ${data.stall.source} · Originaldiagramm mit grafischem Rechenweg`, 40, 2150, { size: 14, color: "#687b8d" });

      const blob = await canvasToBlob(canvas);
      const fileName = `${utcTimestamp(exportDate)}Z Grob G115B Überziehgeschwindigkeit.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Grob G115B Überziehgeschwindigkeit" });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }
    } finally {
      if (overlayUrl) URL.revokeObjectURL(overlayUrl);
      button.disabled = false;
      button.textContent = "Als Bild speichern";
    }
  }

  function createChartVisualization(inputs, result) {
    const overlay = createOverlay(inputs);
    const stage = ui.el(
      "div",
      { className: "stall-chart-stage" },
      ui.el("img", {
        className: "stall-chart-image",
        attrs: {
          src: "assets/grob115b-stall-chart.png",
          alt: "Originales Flughandbuchdiagramm Bild 5.3.4 Überziehgeschwindigkeiten",
          width: String(data.stall.chart.width),
          height: String(data.stall.chart.height),
        },
      }),
      overlay
    );
    const toggle = ui.el("input", { attrs: { type: "checkbox", checked: "checked", "aria-label": "Rechenweg einblenden" } });
    toggle.addEventListener("change", () => stage.classList.toggle("overlay-hidden", !toggle.checked));
    const downloadButton = ui.el("button", { className: "takeoff-chart-download", text: "Als Bild speichern", attrs: { type: "button" } });
    downloadButton.addEventListener("click", () => exportChartImage(inputs, result, overlay, downloadButton).catch((error) => {
      if (error.name !== "AbortError") console.error(error);
    }));

    return ui.el(
      "div",
      { className: "card takeoff-chart-card stall-chart-card" },
      ui.el("div", { className: "takeoff-chart-header" },
        ui.el("div", { className: "card-title", text: "Grafische Nachvollziehbarkeit" }),
        ui.el("div", { className: "takeoff-chart-actions" },
          ui.el("label", { className: "takeoff-chart-toggle" }, toggle, ui.el("span", { text: "Rechenweg" })),
          downloadButton
        )
      ),
      ui.el("div", { className: "stall-chart-scroll" }, stage),
      ui.el("div", { className: "takeoff-chart-legend" },
        ui.el("span", { className: "stall-chart-key", text: `${inputs.powerMode === "leerlauf" ? "Leerlauf" : "Vollast"} · Klappen ${inputs.flapsDegrees}°` }),
        ui.el("span", { text: `${inputs.massKg} kg` }),
        ui.el("span", { text: `IAS · ${result.stallSpeedKt.toFixed(1)} kt · ${result.stallSpeedKmh.toFixed(1)} km/h` })
      )
    );
  }

  function renderResult(elements, inputs, result) {
    ui.replaceContent(elements.resultRoot, [
      ui.createConditionsCard(result.conditions),
      ui.createCard(
        `Ergebnis - ${inputs.massKg} kg · ${inputs.powerMode === "leerlauf" ? "Leerlauf" : "Vollast"} · Klappen ${inputs.flapsDegrees}°`,
        ui.el("div", { className: "result-grid", style: { gridTemplateColumns: "1fr" } },
          ui.createMetricItem({
            label: ui.el("span", {}, "Überziehgeschwindigkeit · ", ui.speedSymbol(result.stallLabel.slice(1))),
            value: result.stallSpeedKt.toFixed(1),
            unit: "kt",
            speedType: "IAS",
            subtext: `${result.stallSpeedKmh.toFixed(1)} km/h`,
          })
        )
      ),
      createChartVisualization(inputs, result),
    ]);
  }

  function refresh() {
    const elements = getElements();
    const inputs = readInputs(elements);
    renderResult(elements, inputs, calculators.calculateStall(inputs));
  }

  function setPower(powerMode) {
    currentPower = powerMode;
    ["leerlauf", "vollast"].forEach((key) => document.getElementById(`mode-${key}-btn`).classList.toggle("active", key === powerMode));
    refresh();
  }

  function setFlaps(flapsDegrees) {
    currentFlaps = flapsDegrees;
    [0, 12, 40].forEach((key) => document.getElementById(`mode-f${key}-btn`).classList.toggle("active", key === flapsDegrees));
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
