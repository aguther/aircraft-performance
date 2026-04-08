(function () {
  const THEME_STORAGE_KEY = "g115b-theme";
  const THEME_AUTO = "auto";
  const systemThemeQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

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

  function getStoredThemePreference() {
    return localStorage.getItem(THEME_STORAGE_KEY) || THEME_AUTO;
  }

  function resolveTheme(themePreference) {
    if (themePreference === THEME_AUTO) {
      return systemThemeQuery && systemThemeQuery.matches ? "dark" : "light";
    }

    return themePreference === "dark" ? "dark" : "light";
  }

  function updateThemeMeta(theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      return;
    }

    metaThemeColor.setAttribute("content", theme === "dark" ? "#08131d" : "#005f8a");
  }

  function applyTheme(themePreference) {
    const resolvedTheme = resolveTheme(themePreference);
    const isDarkTheme = resolvedTheme === "dark";
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = themePreference;
    updateThemeMeta(resolvedTheme);

    const track = document.getElementById("tTrack");
    const thumb = document.getElementById("tThumb");
    const label = document.getElementById("tLabel");
    const toggle = track ? track.closest(".theme-toggle") : document.querySelector(".theme-toggle");

    if (track) {
      track.dataset.themeMode = themePreference;
      track.dataset.resolvedTheme = resolvedTheme;
    }
    if (thumb) {
      thumb.dataset.themeMode = themePreference;
      thumb.dataset.resolvedTheme = resolvedTheme;
    }
    if (label) {
      label.textContent =
        themePreference === THEME_AUTO ? "Auto" : isDarkTheme ? "Dark" : "Light";
    }
    if (toggle) {
      toggle.dataset.themeMode = themePreference;
      toggle.dataset.resolvedTheme = resolvedTheme;
      toggle.setAttribute("aria-label", `Theme: ${themePreference === THEME_AUTO ? `Auto (${isDarkTheme ? "Dark" : "Light"})` : isDarkTheme ? "Dark" : "Light"}`);
      toggle.setAttribute(
        "title",
        themePreference === THEME_AUTO
          ? `Theme folgt dem Geraet: ${isDarkTheme ? "Dark" : "Light"}`
          : `Theme manuell gesetzt: ${isDarkTheme ? "Dark" : "Light"}`
      );
    }
  }

  function initTheme() {
    applyTheme(getStoredThemePreference());
  }

  function toggleTheme() {
    const currentPreference = document.documentElement.dataset.themePreference || getStoredThemePreference();
    const nextTheme =
      currentPreference === THEME_AUTO
        ? "light"
        : currentPreference === "light"
          ? "dark"
          : THEME_AUTO;
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
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

  function normalizeNumericString(value) {
    const source = String(value ?? "").trim().replace(/,/g, ".");
    let normalized = "";
    let hasDecimalSeparator = false;

    for (const character of source) {
      if (character >= "0" && character <= "9") {
        normalized += character;
        continue;
      }

      if (character === "." && !hasDecimalSeparator) {
        normalized += character;
        hasDecimalSeparator = true;
        continue;
      }

      if (character === "-" && normalized === "") {
        normalized += character;
      }
    }

    return normalized;
  }

  function parseNormalizedNumber(value) {
    const normalized = normalizeNumericString(value);
    if (normalized === "" || normalized === "-" || normalized === "." || normalized === "-.") {
      return null;
    }

    const parsedValue = Number.parseFloat(normalized);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function updateSliderLabel(rangeId, value, config) {
    const label = document.getElementById(`${rangeId}-val`);
    if (!label) return;

    const units = (config && config.units) || defaultSliderUnits;
    const decimals = (config && config.decimals) || defaultSliderDecimals;
    const parsedValue = parseNormalizedNumber(value);
    if (parsedValue === null) return;
    label.textContent = `${parsedValue.toFixed(decimals[rangeId] ?? 0)}${units[rangeId] || ""}`;
  }

  function syncSlider(inputId, rangeId, config) {
    const range = document.getElementById(rangeId);
    const input = document.getElementById(inputId);
    if (!range || !input) return;
    input.value = normalizeNumericString(range.value);
    updateSliderLabel(rangeId, range.value, config);
  }

  function syncInput(inputId, rangeId, config) {
    const input = document.getElementById(inputId);
    const range = document.getElementById(rangeId);
    if (!input || !range) return;

    const normalizedValue = normalizeNumericString(input.value);
    if (input.value !== normalizedValue) {
      input.value = normalizedValue;
    }

    if (
      normalizedValue === "" ||
      normalizedValue === "-" ||
      normalizedValue === "." ||
      normalizedValue === "-." ||
      normalizedValue.endsWith(".")
    ) {
      return;
    }

    range.value = String(parseNormalizedNumber(normalizedValue));
    updateSliderLabel(rangeId, range.value, config);
  }

  function commitInput(inputId, rangeId, config) {
    const input = document.getElementById(inputId);
    const range = document.getElementById(rangeId);
    if (!input || !range) return;

    syncInput(inputId, rangeId, config);

    const parsedValue = parseNormalizedNumber(input.value);
    if (parsedValue === null) {
      input.value = normalizeNumericString(range.value);
      updateSliderLabel(rangeId, range.value, config);
      return;
    }

    input.value = String(parsedValue);
    range.value = String(parsedValue);
    updateSliderLabel(rangeId, range.value, config);
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

  function createAtmosphereContent(config) {
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

    if (config.isaDeviationText) {
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

    return el("div", { className: "atmos-grid" }, atmosphereItems);
  }

  function createAtmosphereCard(config) {
    return createCard("Atmosphaere", createAtmosphereContent(config));
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

  function createConditionsContent(conditions) {
    return el(
      "div",
      { className: "conditions-grid" },
      conditions.map((condition) => el("span", { text: condition }))
    );
  }

  function createConditionsCard(conditions) {
    return createCard("Bedingungen", createConditionsContent(conditions));
  }

  function createContextCard(config) {
    const sections = [];

    if (config.atmosphere) {
      sections.push(createAtmosphereContent(config.atmosphere));
    }

    if (config.conditions && config.conditions.length > 0) {
      sections.push(
        el("div", { className: "context-card-block" }, [
          sections.length > 0 ? el("div", { className: "context-divider", text: "Bedingungen" }) : null,
          createConditionsContent(config.conditions),
        ])
      );
    }

    return createCard(config.title || "Rahmenbedingungen", el("div", { className: "context-card-body" }, sections));
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

  function markResponsiveFields() {
    document.querySelectorAll(".field").forEach((field) => {
      field.classList.toggle("range-field", Boolean(field.querySelector(".slider-row")));
    });
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
    commitInput,
    createCard,
    createDisclaimerCard,
    createWarnings,
    createAtmosphereCard,
    createMetricItem,
    createGridCard,
    createConditionsCard,
    createContextCard,
    createPipelineCard,
    replaceContent,
    markResponsiveFields,
    resolveTheme,
  };

  window.toggleTheme = toggleTheme;
  window.toggleMenu = toggleMenu;
  window.syncSlider = syncSlider;
  window.syncInput = syncInput;
  window.commitInput = commitInput;

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupNavigationDropdown();
    markResponsiveFields();
  });

  if (systemThemeQuery) {
    systemThemeQuery.addEventListener("change", () => {
      if (getStoredThemePreference() === THEME_AUTO) {
        applyTheme(THEME_AUTO);
      }
    });
  }
})();
