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

  function svgElement(tagName, attributes, text) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function axisPosition(value, values, pixels) {
    return core.interpolate1D(values, pixels, clamp(value, values[0], values[values.length - 1]));
  }

  function appendPolyline(svg, points, className) {
    svg.append(svgElement("polyline", {
      points: points.map(([x, y]) => `${x},${y}`).join(" "),
      class: className,
    }));
  }

  function markerRadius(chart) {
    return Math.max(9, chart.width / 350);
  }

  function createTracePoints(inputs, outputValue, chart) {
    const resultX = axisPosition(outputValue, chart.resultValues, chart.resultPixels);
    const y = axisPosition(inputs.densityAltitudeFt, chart.altitudeValues, chart.altitudePixels);
    const densityAxisX = axisPosition(inputs.densityAltitudeFt, chart.altitudeValues, chart.densityAxisPixels);
    const resultEntryX = axisPosition(inputs.densityAltitudeFt, chart.altitudeValues, chart.resultEntryPixels);
    const temperatureBottom = chart.temperatureBottomPixel;
    const resultBottom = chart.resultBottomPixel;
    if (inputs.mode === "da") {
      return {
        linePoints: [[densityAxisX, y], [resultEntryX, y], [resultX, y], [resultX, resultBottom]],
        markerPoints: [[densityAxisX, y], [resultX, resultBottom]],
      };
    }
    const oatX = axisPosition(inputs.oatC, chart.temperatureValues, chart.temperaturePixels);
    return {
      linePoints: [
        [oatX, temperatureBottom],
        [oatX, y],
        [densityAxisX, y],
        [resultEntryX, y],
        [resultX, y],
        [resultX, resultBottom],
      ],
      markerPoints: [[oatX, temperatureBottom], [oatX, y], [densityAxisX, y], [resultX, resultBottom], [resultX, y]],
    };
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  async function downloadChart(chart, trace, fileName, button) {
    button.disabled = true;
    button.textContent = "Erzeuge PNG…";
    try {
      const image = await loadImage(chart.source);
      const canvas = document.createElement("canvas");
      canvas.width = chart.width;
      canvas.height = chart.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      context.strokeStyle = "#e90000";
      context.fillStyle = "#e90000";
      context.lineWidth = Math.max(4, chart.width / 700);
      context.lineCap = "butt";
      context.lineJoin = "round";
      context.beginPath();
      trace.linePoints.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
      context.stroke();
      trace.markerPoints.forEach(([x, y]) => {
        context.beginPath();
        context.arc(x, y, markerRadius(chart), 0, Math.PI * 2);
        context.fill();
      });
      canvas.toBlob((pngBlob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(pngBlob);
        link.download = fileName;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        button.disabled = false;
        button.textContent = "Als Bild speichern";
      }, "image/png");
    } catch (error) {
      button.disabled = false;
      button.textContent = "Als Bild speichern";
      throw error;
    }
  }

  function createCruiseChart(inputs, chart) {
    const trace = createTracePoints(inputs, chart.value, chart);
    const svg = svgElement("svg", {
      class: "takeoff-chart-overlay",
      viewBox: `0 0 ${chart.width} ${chart.height}`,
      "aria-label": `Grafischer Rechenweg im originalen ${chart.title}`,
    });
    appendPolyline(svg, trace.linePoints, "cruise-chart-trace");
    trace.markerPoints.forEach(([x, y]) => {
      svg.append(svgElement("circle", { cx: x, cy: y, r: markerRadius(chart), class: "cruise-chart-trace-point" }));
    });

    const stage = ui.el(
      "div",
      {
        className: "takeoff-chart-stage cruise-chart-stage",
        style: { aspectRatio: `${chart.width} / ${chart.height}` },
      },
      ui.el("img", {
        className: "takeoff-chart-image",
        attrs: { src: chart.source, alt: chart.title, width: String(chart.width), height: String(chart.height) },
      }),
      svg
    );
    const toggle = ui.el("input", { attrs: { type: "checkbox", checked: "checked", "aria-label": "Rechenweg einblenden" } });
    toggle.addEventListener("change", () => stage.classList.toggle("overlay-hidden", !toggle.checked));
    const downloadButton = ui.el("button", {
      className: "takeoff-chart-download",
      text: "Als Bild speichern",
      attrs: { type: "button" },
    });
    downloadButton.addEventListener("click", () => {
      downloadChart(chart, trace, `Grob G115B ${chart.fileName}.png`, downloadButton).catch(console.error);
    });

    return ui.el(
      "div",
      { className: "card takeoff-chart-card" },
      ui.el(
        "div",
        { className: "takeoff-chart-header" },
        ui.el("div", { className: "card-title", text: chart.cardTitle }),
        ui.el(
          "div",
          { className: "takeoff-chart-actions" },
          ui.el("label", { className: "takeoff-chart-toggle" }, toggle, ui.el("span", { text: "Rechenweg" })),
          downloadButton
        )
      ),
      ui.el("div", { className: "takeoff-chart-scroll" }, stage),
      ui.el(
        "div",
        { className: "takeoff-chart-legend" },
        ui.el("span", { className: "takeoff-chart-key", text: "Rechenweg im POH-Diagramm" }),
        ui.el("span", { text: `Density Altitude: ${inputs.densityAltitudeFt.toLocaleString("de-DE")} ft` }),
        ui.el("span", { text: chart.resultText })
      )
    );
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

    nodes.push(
      createCruiseChart(inputs, {
        kind: "speed",
        title: "POH Bild 5.3.12 Reiseflug wahre Fluggeschwindigkeit",
        cardTitle: "Grafische Nachvollziehbarkeit · Wahre Fluggeschwindigkeit",
        fileName: "Wahre Fluggeschwindigkeit",
        source: "assets/grob115b-cruise-speed-chart.png",
        width: 4101,
        height: 2880,
        temperatureValues: [-30, -20, -10, 0, 10, 20, 30, 40],
        temperaturePixels: [675, 843, 1011, 1179, 1347, 1515, 1682, 1849],
        temperatureBottomPixel: 2253,
        resultBottomPixel: 2253,
        altitudeValues: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000],
        altitudePixels: [2253, 2083, 1916, 1746, 1579, 1409, 1236, 1068, 899, 731, 563],
        densityAxisPixels: [675, 675, 675, 675, 675, 675, 675, 675, 675, 675, 675],
        resultEntryPixels: [1798, 1798, 1798, 1798, 1798, 1798, 1798, 1798, 1798, 1798, 1798],
        resultValues: [170, 180, 190, 200, 210, 220, 230, 240, 250, 260],
        resultPixels: [1948, 2112, 2276, 2440, 2604, 2768, 2932, 3096, 3260, 3423],
        value: result.tasKmh,
        resultText: `${Math.round(result.tasKmh)} km/h · ${result.tasKt.toFixed(1)} kt TAS`,
      }),
      createCruiseChart(inputs, {
        kind: "rpm",
        title: "POH Bild 5.3.11 Reiseflug Drehzahl",
        cardTitle: "Grafische Nachvollziehbarkeit · Drehzahl",
        fileName: "Drehzahl",
        source: "assets/grob115b-cruise-rpm-chart.png",
        width: 4105,
        height: 2886,
        temperatureValues: [-30, -20, -10, 0, 10, 20, 30, 40],
        temperaturePixels: [696, 863, 1032, 1197, 1365, 1534, 1703, 1879],
        temperatureBottomPixel: 2185,
        resultBottomPixel: 2191,
        altitudeValues: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000],
        altitudePixels: [2181, 2012, 1843, 1673, 1507, 1340, 1166, 997, 830, 662, 494],
        densityAxisPixels: [696, 696, 696, 696, 696, 696, 696, 696, 696, 696, 696],
        resultEntryPixels: [1852, 1852, 1852, 1852, 1852, 1852, 1852, 1852, 1852, 1852, 1852],
        resultValues: [2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000],
        resultPixels: [2010, 2152, 2292, 2436, 2580, 2724, 2867, 3012, 3152, 3296, 3440],
        value: result.rpm,
        resultText: `${Math.round(result.rpm)} rpm`,
      })
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
