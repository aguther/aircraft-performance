(function () {
  const defaultSliderUnits = {
    "slope-range": " %",
    "wind-range": " kt",
    "zuschl-range": " %",
    "pwr-range": " %",
    "fuel-range": " l",
    "mass-range": " kg",
    "oat-range": " °C",
    "qnh-range": " hPa",
    "from-qnh-range": " hPa",
    "to-qnh-range": " hPa",
    "from-oat-range": " °C",
    "to-oat-range": " °C",
  };

  const defaultSliderDecimals = {
    "slope-range": 1,
    "wind-range": 0,
    "zuschl-range": 0,
    "pwr-range": 0,
    "fuel-range": 0,
    "mass-range": 0,
    "oat-range": 0,
    "qnh-range": 0,
    "from-qnh-range": 0,
    "to-qnh-range": 0,
    "from-oat-range": 0,
    "to-oat-range": 0,
  };

  function el(tagName, options, ...children) {
    const element = document.createElement(tagName);
    const config = options || {};

    if (config.className) {
      element.className = config.className;
    }

    if (config.text !== undefined) {
      element.textContent = config.text;
    }

    if (config.attrs) {
      Object.entries(config.attrs).forEach(([name, value]) => {
        if (value !== undefined && value !== null) {
          element.setAttribute(name, value);
        }
      });
    }

    if (config.dataset) {
      Object.entries(config.dataset).forEach(([name, value]) => {
        if (value !== undefined && value !== null) {
          element.dataset[name] = value;
        }
      });
    }

    if (config.style) {
      Object.assign(element.style, config.style);
    }

    children
      .flat()
      .filter((child) => child !== undefined && child !== null && child !== false)
      .forEach((child) => {
        element.append(child);
      });

    return element;
  }

  function metricValue(value, unit, className, style) {
    const children = [String(value)];
    if (unit) {
      children.push(" ", el("span", { text: unit }));
    }

    return el("div", { className, style }, children);
  }

  function applyTheme(theme) {
    const isDarkTheme = theme === "dark";
    document.documentElement.dataset.theme = theme;

    const track = document.getElementById("tTrack");
    const thumb = document.getElementById("tThumb");
    const label = document.getElementById("tLabel");

    if (track) track.classList.toggle("on", isDarkTheme);
    if (thumb) thumb.classList.toggle("on", isDarkTheme);
    if (label) label.textContent = isDarkTheme ? "Dark" : "Light";
  }

  function initTheme() {
    applyTheme(localStorage.getItem("g115b-theme") || "light");
  }

  function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("g115b-theme", nextTheme);
    applyTheme(nextTheme);
  }

  function setupNavigationDropdown() {
    const dropdown = document.getElementById("navDropdown");
    const button = document.getElementById("navMenuBtn");

    if (!dropdown || !button || document.body.dataset.navDropdownInitialized === "true") {
      return;
    }

    document.body.dataset.navDropdownInitialized = "true";
    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target) && !button.contains(event.target)) {
        dropdown.classList.remove("open");
      }
    });
  }

  function toggleMenu() {
    const dropdown = document.getElementById("navDropdown");
    if (dropdown) dropdown.classList.toggle("open");
  }

  function updateSliderLabel(rangeId, value, config) {
    const label = document.getElementById(`${rangeId}-val`);
    if (!label) return;

    const units = (config && config.units) || defaultSliderUnits;
    const decimals = (config && config.decimals) || defaultSliderDecimals;
    label.textContent = `${Number.parseFloat(value).toFixed(decimals[rangeId] ?? 0)}${units[rangeId] || ""}`;
  }

  function syncSlider(inputId, rangeId, config) {
    const range = document.getElementById(rangeId);
    const input = document.getElementById(inputId);
    if (!range || !input) return;
    input.value = range.value;
    updateSliderLabel(rangeId, range.value, config);
  }

  function syncInput(inputId, rangeId, config) {
    const input = document.getElementById(inputId);
    const range = document.getElementById(rangeId);
    if (!input || !range) return;
    range.value = input.value;
    updateSliderLabel(rangeId, input.value, config);
  }

  function createCard(title, content) {
    return el(
      "div",
      { className: "card" },
      el("div", { className: "card-title", text: title }),
      content
    );
  }

  function createDisclaimerCard() {
    return el(
      "div",
      { className: "disclaimer-card" },
      el("div", { className: "disclaimer-tag", text: "⚠ Wichtiger Hinweis" }),
      el("div", {
        className: "disclaimer-text",
        text: "Diese Anwendung ersetzt nicht das originale, zugelassene AFM/POH der jeweiligen Maschine. Die Verantwortung fuer alle Flugentscheidungen liegt ausschliesslich beim Piloten.",
      })
    );
  }

  function createWarnings(warnings) {
    if (!warnings || warnings.length === 0) return null;
    return el(
      "div",
      { className: "warnings" },
      warnings.map((warning) =>
        el("div", {
          className: `warn-item${warning.danger ? " danger" : ""}`,
          text: warning.text,
        })
      )
    );
  }

  function createAtmosphereCard(config) {
    const atmosphereItems = [
      el(
        "div",
        { className: "atmos-item" },
        el("div", { className: "atmos-item-label", text: "Density Altitude" }),
        el("div", {
          className: `atmos-item-value${config.densityAltitudeWarn ? " warn" : ""}`,
          text: `${config.densityAltitudeFt.toLocaleString("de-DE")} ft`,
        })
      ),
    ];

    if (config.isaDeviationC !== undefined && config.isaDeviationText) {
      atmosphereItems.push(
        el(
          "div",
          { className: "atmos-item" },
          el("div", { className: "atmos-item-label", text: "ISA-Abweichung" }),
          el("div", {
            className: `atmos-item-value${config.isaDeviationClass ? ` ${config.isaDeviationClass}` : ""}`,
            text: config.isaDeviationText,
          })
        )
      );
    }

    return createCard("Atmosphaere", el("div", { className: "atmos-grid" }, atmosphereItems));
  }

  function createMetricItem(config) {
    const labelClassName = config.labelClassName || "result-item-label";
    const valueClassName = config.valueClassName || "result-item-value";
    const subtextClassName = config.subtextClassName || "result-item-sub";
    const children = [
      el("div", { className: labelClassName, text: config.label }),
      metricValue(config.value, config.unit, `${valueClassName}${config.valueClassName ? ` ${config.valueClassName}` : ""}`, config.valueStyle),
    ];

    if (config.subtext) {
      children.push(el("div", { className: subtextClassName, text: config.subtext }));
    }

    return el("div", { className: config.className || "result-item" }, children);
  }

  function createGridCard(title, gridClassName, items) {
    return createCard(title, el("div", { className: gridClassName }, items));
  }

  function createConditionsCard(conditions) {
    return createCard(
      "Bedingungen",
      el(
        "div",
        { className: "conditions-grid" },
        conditions.map((condition) => el("span", { text: condition }))
      )
    );
  }

  function createPipelineCard(steps) {
    return createCard(
      "Berechnungsschritte",
      el(
        "div",
        { className: "pipeline" },
        steps.map((step, index) =>
          el(
            "div",
            { className: "step" },
            el(
              "div",
              { className: "step-rail" },
              el("div", { className: "step-dot active" }),
              index < steps.length - 1 ? el("div", { className: "step-line" }) : null
            ),
            el(
              "div",
              { className: "step-body" },
              el("div", { className: "step-name", text: step.name }),
              el("div", { className: "step-detail", text: step.detail })
            ),
            el("div", { className: "step-val", text: step.value })
          )
        )
      )
    );
  }

  function replaceContent(target, nodes) {
    target.replaceChildren(...nodes.filter(Boolean));
  }

  window.G115B = window.G115B || {};
  window.G115B.ui = {
    el,
    applyTheme,
    initTheme,
    toggleTheme,
    setupNavigationDropdown,
    toggleMenu,
    updateSliderLabel,
    syncSlider,
    syncInput,
    createCard,
    createDisclaimerCard,
    createWarnings,
    createAtmosphereCard,
    createMetricItem,
    createGridCard,
    createConditionsCard,
    createPipelineCard,
    replaceContent,
  };

  window.toggleTheme = toggleTheme;
  window.toggleMenu = toggleMenu;
  window.syncSlider = syncSlider;
  window.syncInput = syncInput;

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupNavigationDropdown();
  });
})();
