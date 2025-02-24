import { state, applyStyles } from "./textbox.js";

const fonts = new Map();
const fontListElement = document.getElementById("font-list");
const fontInfoElement = document.getElementById("font-info");
let textBoxManager = null;

function setupEventListeners() {
  document.addEventListener("textbox-updated", (e) => {
    const { font, state } = e.detail;
    if (state === "default") return;
    if (font.family !== "inherit") {
      scrollToFont(font.family);
    }
    updateFeatureToggles(font.features);
    const fontInfo = fonts.get(font.family);
    if (fontInfo) {
      showFontInfo(fontInfo);
    }
  });

  // Listen for textbox selection
  document.addEventListener("textbox-selected", (e) => {
    const { textbox } = e.detail;
    const textboxData = state.textboxes.get(textbox);

    if (!textboxData) return;

    const styles = textboxData.styles;

    // Update font list selection
    if (styles.family !== "inherit") {
      scrollToFont(styles.family);

      const fontInfo = fonts.get(styles.family);
      if (fontInfo) {
        // Update settings panel with font info
        updateSettingsPanel({
          features: fontInfo.features,
          axes: fontInfo.axes,
          instances: fontInfo.instances,
          // Current textbox settings
          currentFeatures: styles.features || {},
          currentAxes: styles.axis || {},
          currentInstance: styles.instance || "Regular",
        });
      }
    }
  });

  // Listen for settings changes
  document.addEventListener("settings-changed", (e) => {
    const { type, name, value, textbox } = e.detail;
    if (!textbox) return;

    const textboxData = state.textboxes.get(textbox);
    if (!textboxData) return;

    console.group("Settings Changed");
    console.log("Type:", type, "Name:", name, "Value:", value);

    // Get font info once at the start
    const fontInfo = fonts.get(textboxData.styles.family);
    if (!fontInfo) return;

    switch (type) {
      case "feature":
        if (!textboxData.styles.features) textboxData.styles.features = {};
        if (value === false) {
          delete textboxData.styles.features[name];
        } else {
          textboxData.styles.features[name] = value;
        }
        break;

      case "axis":
        if (!textboxData.styles.axis) textboxData.styles.axis = {};
        if (value === fontInfo.axes[name].default) {
          delete textboxData.styles.axis[name];
        } else {
          textboxData.styles.axis[name] = value;
        }
        break;

      case "instance":
        if (value === "Regular") {
            delete textboxData.styles.instance;
            // Reset axes to default values
            textboxData.styles.axis = {};
        } else {
            textboxData.styles.instance = value;
            // Find and apply instance coordinates
            const instance = fontInfo.instances.find(i => i.name.en === value);
            if (instance) {
                textboxData.styles.axis = { ...instance.coordinates };
                // Update axis sliders to match instance values
                Object.entries(instance.coordinates).forEach(([axis, value]) => {
                    const slider = document.querySelector(`input[data-axis="${axis}"]`);
                    if (slider) {
                        slider.value = value;
                        slider.nextElementSibling.textContent = value;
                    }
                });
            }
        }
        break;
    }

    console.log("Updated styles:", textboxData.styles);
    console.groupEnd();

    // Apply the updated styles
    applyStyles(textboxData.element, textboxData.styles);
  });
}

async function init(manager) {
  textBoxManager = manager;
  setupEventListeners();
  await loadFontsFromDirectory("/fonts/");
}

async function loadFontsFromDirectory(directory) {
  try {
    const response = await fetch(directory);
    const dirList = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirList, "text/html");
    const fontFiles = Array.from(doc.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((href) => href.match(/\.(ttf|otf|woff|woff2)$/i));

    for (const fontUrl of fontFiles) {
      const fontInfo = await loadFont(fontUrl);
      if (fontInfo) {
        createFontCard(fontInfo);
      }
    }
  } catch (error) {
    console.error("Error loading fonts directory:", error);
  }
}

// Update the loadFont function to include features, axes, and instances
async function loadFont(fontPath) {
  try {
    const response = await fetch(fontPath);
    const arrayBuffer = await response.arrayBuffer();
    const font = opentype.parse(arrayBuffer);

    // Get all OpenType features
    const features = getOpenTypeFeatures(font);

    // Get font variations (axes) if available
    const axes = {};
    if (font.tables.fvar) {
      font.tables.fvar.axes.forEach((axis) => {
        // Get axis name from name table if available
        let axisName = axis.name ? axis.name.en : axis.tag;

        axes[axis.tag] = {
          name: axisName,
          default: axis.defaultValue,
          min: axis.minValue,
          max: axis.maxValue,
        };
      });
    }

    // Get font instances if available
    const instances = [];
    if (font.tables.fvar && font.tables.fvar.instances) {
      font.tables.fvar.instances.forEach((instance, index) => {
        let instanceName;
        // First try to get the instance's actual name
        if (instance.name && instance.name.en) {
          instanceName = instance.name.en;
        } else if (instance.names && instance.names.length > 0) {
          // Fallback to first available name
          instanceName = instance.names[0].name;
        } else {
          // Only generate name from coordinates if no actual name exists
          instanceName =
            Object.entries(instance.coordinates)
              .map(([tag, value]) => {
                const axisName = axes[tag].name;
                return `${axisName}=${Math.round(value)}`;
              })
              .join(" ") || `Instance ${index + 1}`;
        }

        instances.push({
          name: {
            en: instanceName,
          },
          coordinates: instance.coordinates || {},
        });
      });
    }

    const fontInfo = {
      name: getFontName(font, "fontFamily") || "Unknown Font",
      source: fontPath,
      style: getFontName(font, "fontSubfamily") || "Regular",
      font: font,
      features: features,
      axes: axes,
      instances:
        instances.length > 0
          ? instances
          : [
              {
                name: { en: "Regular" },
                coordinates: {},
              },
            ],
    };

    // Add debugging information
    console.group("Font Loaded:", fontInfo.name);
    console.log("Features:", features);
    console.log("Axes:", axes);
    console.log("Instances:", instances);
    console.groupEnd();

    fonts.set(fontInfo.name, fontInfo);
    return fontInfo;
  } catch (error) {
    console.error("Failed to load font:", fontPath, error);
    return null;
  }
}

// Update getFontName to be more defensive
function getFontName(font, name) {
  if (!font || !font.names || !font.names[name]) return null;

  const names = font.names[name];
  return (
    names.en ||
    names["en-US"] ||
    names["en-GB"] ||
    Object.values(names)[0] ||
    null
  );
}

function getOpenTypeFeatures(font) {
  if (!font) return [];
  const features = new Set();
  if (font.tables.gsub) {
    for (let feature of Object.values(font.tables.gsub.features || {})) {
      if (feature.tag) features.add(feature.tag);
    }
  }
  if (font.tables.gpos) {
    for (let feature of Object.values(font.tables.gpos.features || {})) {
      if (feature.tag) features.add(feature.tag);
    }
  }
  return Array.from(features);
}

// Update the createFontCard function
function createFontCard(fontInfo) {
  const card = document.createElement("div");
  card.className = "font-card";

  const style = document.createElement("style");
  style.textContent = `
        @font-face {
            font-family: "${fontInfo.name}";
            src: url("${fontInfo.source}");
        }
    `;
  document.head.appendChild(style);

  const nameEl = document.createElement("div");
  nameEl.className = "font-card__name";
  nameEl.textContent = fontInfo.name;
  nameEl.style.fontFamily = fontInfo.name;

  const infoEl = document.createElement("div");
  infoEl.className = "font-card__info";
  infoEl.innerHTML = `
        <span>${fontInfo.style}</span>
        ${fontInfo.isMonospaced ? "<span>Monospaced</span>" : ""}
        <span>${fontInfo.glyphCount} glyphs</span>
    `;

  const previewEl = document.createElement("div");
  previewEl.className = "font-card__preview";
  previewEl.textContent = "AaBbCc 123";
  previewEl.style.fontFamily = fontInfo.name;

  card.appendChild(nameEl);
  card.appendChild(infoEl);
  card.appendChild(previewEl);

  // Update the card click handler in createFontCard
  card.addEventListener("click", (e) => {
    e.stopPropagation();

    // Create initial feature states (all disabled by default)
    const featureStates = {};
    fontInfo.features.forEach((feature) => {
      featureStates[feature] = false;
    });

    // Create initial axis values (using defaults)
    const axisValues = {};
    Object.entries(fontInfo.axes).forEach(([tag, axis]) => {
      axisValues[tag] = axis.default;
    });

    // Get default instance (usually 'Regular')
    const defaultInstance = fontInfo.instances[0];

    const fontData = {
      family: fontInfo.name,
      features: featureStates,
      axes: axisValues,
      instance: defaultInstance.name,
      instanceData: defaultInstance.coordinates,
    };

    // Add detailed logging
    console.group(`Font Selected: ${fontInfo.name}`);
    console.log("Font Info:", {
      name: fontInfo.name,
      style: fontInfo.style,
      features: fontInfo.features,
      axes: fontInfo.axes,
      instances: fontInfo.instances,
    });
    console.log("Initial Font Data:", {
      family: fontData.family,
      features: fontData.features,
      axes: fontData.axes,
      instance: fontData.instance,
      instanceData: fontData.instanceData,
    });
    console.groupEnd();

    updateFontCardSelection(card);

    // Dispatch custom event for font selection
    const event = new CustomEvent("font-selected", {
      detail: {
        fontData,
        fontInfo: {
          ...fontInfo,
          availableFeatures: fontInfo.features,
          availableAxes: fontInfo.axes,
          availableInstances: fontInfo.instances,
        },
      },
    });
    document.dispatchEvent(event);
  });

  fontListElement.appendChild(card);
}

function scrollToFont(fontFamily) {
  const fontCard = Array.from(
    fontListElement.querySelectorAll(".font-card")
  ).find(
    (card) => card.querySelector(".font-card__name").textContent === fontFamily
  );
  if (fontCard) {
    fontCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function updateFontCardSelection(selectedCard) {
  document
    .querySelectorAll(".font-card")
    .forEach((card) => card.classList.toggle("active", card === selectedCard));
}

function isDefaultValue(setting, value) {
  // Helper to check if a setting is at its default value
  const fontInfo = fonts.get(state.activeTextbox.styles.family);
  if (!fontInfo) return true;

  switch (setting.type) {
    case "feature":
      return value === false;
    case "axis":
      return value === fontInfo.axes[setting.name].default;
    case "instance":
      return value === "Regular";
    default:
      return true;
  }
}

// Add this new function to update the settings panel
function updateSettingsPanel(data) {
  console.group("Updating Settings Panel");
  console.log("Settings Data:", data);

  const settingsPanel = document.querySelector(
    "#settings-panel .panel__content-wrapper"
  );
  if (!settingsPanel) {
    console.error("Settings panel not found");
    console.groupEnd();
    return;
  }

  // Clear existing content
  settingsPanel.innerHTML = "";

  // Add features section if available
  if (data.features && data.features.length > 0) {
    const featuresSection = document.createElement("div");
    featuresSection.className = "settings-section features-section";
    featuresSection.innerHTML = `
            <h3>OpenType Features</h3>
            <div class="features-grid">
                ${data.features.map(feature => `
                    <label class="feature-toggle">
                        <input type="checkbox" 
                               data-feature="${feature}"
                               ${data.currentFeatures[feature] ? "checked" : ""}>
                        <span class="feature-label">${feature}</span>
                    </label>
                `).join("")}
            </div>
        `;
    settingsPanel.appendChild(featuresSection);
  }

  // Add axes section if available
  if (Object.keys(data.axes).length > 0) {
    const axesSection = document.createElement("div");
    axesSection.className = "settings-section axes-section";
    axesSection.innerHTML = `
            <h3>Variable Axes</h3>
            <div class="axes-list">
                ${Object.entries(data.axes).map(([tag, axis]) => `
                    <div class="axis-slider">
                        <label>${axis.name}</label>
                        <div class="slider-row">
                            <input type="range" 
                                   data-axis="${tag}"
                                   min="${axis.min}"
                                   max="${axis.max}"
                                   value="${data.currentAxes[tag] || axis.default}"
                                   step="1">
                            <span class="axis-value">
                                ${data.currentAxes[tag] || axis.default}
                            </span>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    settingsPanel.appendChild(axesSection);
  }

  // Add instances section if available
  if (data.instances && data.instances.length > 0) {
    const instancesSection = document.createElement("div");
    instancesSection.className = "settings-section instances-section";
    instancesSection.innerHTML = `
            <h3>Instances</h3>
            <div class="instances-list">
                ${data.instances.map(instance => `
                    <button class="instance-button ${data.currentInstance === instance.name.en ? 'active' : ''}"
                            data-instance="${instance.name.en}">
                        ${instance.name.en}
                    </button>
                `).join("")}
            </div>
        `;
    settingsPanel.appendChild(instancesSection);
  }

  // Add event listeners for settings changes
  setupSettingsEventListeners(settingsPanel);

  console.log("Settings panel updated");
  console.groupEnd();
}

function setupSettingsEventListeners(panel) {
  // Feature toggles
  panel.querySelectorAll("input[data-feature]").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const event = new CustomEvent("settings-changed", {
        detail: {
          type: "feature",
          name: e.target.dataset.feature,
          value: e.target.checked,
          textbox: state.activeTextbox, // Add active textbox reference
        },
      });
      document.dispatchEvent(event);
    });
  });

  // Axis sliders
  panel.querySelectorAll("input[data-axis]").forEach((slider) => {
    slider.addEventListener("input", (e) => {
      const event = new CustomEvent("settings-changed", {
        detail: {
          type: "axis",
          name: e.target.dataset.axis,
          value: parseFloat(e.target.value),
          textbox: state.activeTextbox, // Add active textbox reference
        },
      });
      document.dispatchEvent(event);
      slider.nextElementSibling.textContent = e.target.value;
    });
  });

  // Instance select
  const instanceSelect = panel.querySelector(".instance-select");
  if (instanceSelect) {
    instanceSelect.addEventListener("change", (e) => {
      const event = new CustomEvent("settings-changed", {
        detail: {
          type: "instance",
          value: e.target.value,
          textbox: state.activeTextbox, // Add active textbox reference
        },
      });
      document.dispatchEvent(event);
    });
  }

  // Instance buttons
  panel.querySelectorAll(".instance-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      // Remove active class from all buttons
      panel.querySelectorAll(".instance-button").forEach(btn => 
          btn.classList.remove("active"));
      // Add active class to clicked button
      button.classList.add("active");
      
      const event = new CustomEvent("settings-changed", {
          detail: {
              type: "instance",
              value: button.dataset.instance,
              textbox: state.activeTextbox
          }
      });
      document.dispatchEvent(event);
    });
  });
}

export {
  init as initFontManager,
  updateSettingsPanel,
  scrollToFont,
  updateFontCardSelection,
};
