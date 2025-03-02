import { state, applyStyles } from "./textbox.js";
import { googleFontsLoader, FONTS_PER_PAGE } from "./google-fonts-loader.js";

const fonts = new Map();
const fontListElement = document.getElementById("font-list");
const fontInfoElement = document.getElementById("font-info");
let textBoxManager = null;

// Add these constants at the top
let currentPage = 0;
let googleFontsData = [];
let googleSection;
let isLoadingFonts = false; // Add this
let hasMoreFonts = true;
let selectedFontCard = null;

// Add these variables at the top with other state variables
let searchQuery = '';
let filteredFontsList = [];
let isSearching = false;

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
          size: parseInt(styles.size),
          features: fontInfo.features,
          axes: fontInfo.axes,
          instances: fontInfo.instances,
          // Current textbox settings
          currentFeatures: styles.features || {},
          currentAxes: styles.axis || {},
          currentInstance: styles.instance || {},
        });
      }
    }
  });

  // Listen for settings changes
  document.addEventListener("settings-changed", (e) => {
    const { type, name, value, textbox, format } = e.detail;
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
        textboxData.styles.instance = value;
        // Find and apply instance coordinates
        const instance = fontInfo.instances.find((i) => i.name.en === value);
        if (instance) {
          textboxData.styles.axis = { ...instance.coordinates };
          // Update axis sliders to match instance values
          Object.entries(instance.coordinates).forEach(([axis, value]) => {
            const slider = document.querySelector(`input[data-axis="${axis}"]`);
            if (slider) {
              const min = parseFloat(slider.min);
              const max = parseFloat(slider.max);
              const percentage = ((value - min) / (max - min)) * 100;

              slider.value = value;
              slider.style.setProperty("--split-percent", `${percentage}%`);

              // Update the value display
              const valueDisplay =
                slider.parentElement.querySelector(".axis-value");
              if (valueDisplay) {
                valueDisplay.textContent = value;
              }
            }
          });
        }
        break;

      case "fontSize":
        textboxData.styles.size = `${value}px`;
        break;
        
      case "format":
        // Handle text formatting options
        switch(format) {
          case "align":
            textboxData.styles.textAlign = value;
            break;
          case "italic":
            textboxData.styles.fontStyle = value ? "italic" : "normal";
            
            // Add padding adjustment for italic text for all textbox types
            if (value) {
              // Apply right padding to accommodate italic slant
              textboxData.styles.paddingRight = "0.5em";
            } else {
              // Remove padding when not italic
              textboxData.styles.paddingRight = "0";
            }
            break;
          case "underline":
            textboxData.styles.textDecoration = value ? "underline" : "none";
            break;
        }
        break;
    }

    console.log("Updated styles:", textboxData.styles);
    console.groupEnd();

    // Apply the updated styles
    applyStyles(textboxData.element, textboxData.styles);
  });
}

// Add search functionality in init function
async function init(manager) {
  textBoxManager = manager;
  setupEventListeners();
  
  // Add search input
  const searchDiv = document.createElement('div');
  searchDiv.className = 'font-search';
  searchDiv.innerHTML = `
    <input type="text" 
           class="font-search__input" 
           placeholder="Search fonts..."
           aria-label="Search fonts">
  `;
  fontListElement.insertBefore(searchDiv, fontListElement.firstChild);

  // Add search event listener
  const searchInput = searchDiv.querySelector('.font-search__input');
  searchInput.addEventListener('input', debounce(handleSearch, 300));

  await loadFonts();
}

// Add debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add search handler function
async function handleSearch(e) {
  searchQuery = e.target.value.toLowerCase();
  currentPage = 0;
  isLoadingFonts = false;
  
  // Clear existing fonts
  const localSection = document.querySelector('.local-fonts');
  const googleSection = document.querySelector('.google-fonts');
  
  if (localSection) {
    const localTitle = localSection.querySelector('.font-list-section__title');
    localSection.innerHTML = '';
    localSection.appendChild(localTitle);
    // Show/hide title based on search query
    localTitle.style.display = searchQuery ? 'none' : '';
  }
  
  if (googleSection) {
    const googleTitle = googleSection.querySelector('.font-list-section__title');
    googleSection.innerHTML = '';
    googleSection.appendChild(googleTitle);
    // Show/hide title based on search query
    googleTitle.style.display = searchQuery ? 'none' : '';
  }

  // Filter and reload fonts
  await loadFonts();
}

async function loadFonts() {
  try {
    // Load local fonts first
    await loadLocalFonts();

    // Then load Google Fonts
    await loadGoogleFonts();
  } catch (error) {
    console.error("Error loading fonts:", error);
  }
}

// Modify loadLocalFonts to handle search
async function loadLocalFonts() {
  try {
    const response = await fetch("/fonts/");
    const dirList = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirList, "text/html");
    const fontFiles = Array.from(doc.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((href) => href.match(/\.(ttf|otf|woff|woff2)$/i));

    // Create a section for local fonts if it doesn't exist
    let localSection = document.querySelector('.local-fonts');
    if (!localSection) {
      localSection = document.createElement("div");
      localSection.className = "font-list-section local-fonts";
      localSection.innerHTML = '<h3 class="font-list-section__title">Local Fonts</h3>';
      fontListElement.appendChild(localSection);
    }

    for (const fontUrl of fontFiles) {
      const fontInfo = await loadFont(fontUrl);
      if (fontInfo && (!searchQuery || fontInfo.name.toLowerCase().includes(searchQuery))) {
        const card = createFontCard(fontInfo, localSection);
        if (!selectedFontCard) {
          card.click();
        }
      }
    }
  } catch (error) {
    console.error("Error loading local fonts:", error);
  }
}

// Update loadGoogleFonts function
async function loadGoogleFonts() {
  try {
    // Initialize Google Fonts loader
    await googleFontsLoader.init();

    // Create Google fonts section if not exists
    if (!googleSection) {
      googleSection = document.createElement("div");
      googleSection.className = "font-list-section google-fonts";
      googleSection.innerHTML =
        '<h3 class="font-list-section__title">Google Fonts</h3>';
      fontListElement.appendChild(googleSection);
    }

    // Load initial batch
    await loadMoreGoogleFonts();

    // Setup intersection observer for infinite scroll
    setupInfiniteScroll();
  } catch (error) {
    console.error("Error loading Google fonts:", error);
  }
}

// Modify loadMoreGoogleFonts to handle search
async function loadMoreGoogleFonts() {
  if (isLoadingFonts) return;

  const start = currentPage * FONTS_PER_PAGE;
  const filteredFonts = googleFontsLoader.fontsData.filter(font => 
    font.family.toLowerCase().includes(searchQuery)
  );

  // Check if we've reached the end of results
  if (start >= filteredFonts.length) {
    hasMoreFonts = false;
    // Remove loading indicator if it exists
    const loadingIndicator = googleSection.querySelector(".loading-indicator");
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
    return;
  }

  isLoadingFonts = true;
  const loadingIndicator = googleSection.querySelector(".loading-indicator");
  if (loadingIndicator) {
    loadingIndicator.remove();
  }

  try {
    const fontBatch = filteredFonts.slice(start, start + FONTS_PER_PAGE);
    
    for (const fontData of fontBatch) {
      const fontInfo = googleFontsLoader.getFontInfo(fontData.family);
      if (!fontInfo) continue;

      createFontCard(fontInfo, googleSection);
      fonts.set(fontInfo.name, fontInfo);
    }

    // Only add loading indicator if there are more fonts to load
    if (start + FONTS_PER_PAGE < filteredFonts.length) {
      if (loadingIndicator) {
        googleSection.appendChild(loadingIndicator);
      }
    }

    currentPage++;
  } catch (error) {
    console.error("Error loading Google fonts batch:", error);
  } finally {
    isLoadingFonts = false;
  }
}

// Add infinite scroll setup
function setupInfiniteScroll() {
  // Create and append loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "loading-indicator";
  loadingIndicator.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Loading more fonts...</span>
  `;
  googleSection.appendChild(loadingIndicator);

  // Create intersection observer
  const observer = new IntersectionObserver(
    async (entries) => {
      const indicator = entries[0];
      if (indicator.isIntersecting && !isLoadingFonts) {
        await loadMoreGoogleFonts();
      }
    },
    {
      root: fontListElement,
      rootMargin: "100px",
      threshold: 0.1,
    }
  );

  // Start observing the loading indicator
  observer.observe(loadingIndicator);
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
      instances: instances.length > 0 ? instances : [],
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
function createFontCard(fontInfo, parentElement) {
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

  card.appendChild(nameEl);

  // Update the card click handler
  card.addEventListener("click", (e) => {
    e.stopPropagation();

    // Create initial feature states (all disabled by default)
    const featureStates = {};
    if (fontInfo.features && Array.isArray(fontInfo.features)) {
      fontInfo.features.forEach((feature) => {
        featureStates[feature] = false;
      });
    }

    // Create initial axis values (using defaults)
    const axisValues = {};
    if (fontInfo.axes) {
      Object.entries(fontInfo.axes).forEach(([tag, axis]) => {
        axisValues[tag] = axis.default;
      });
    }

    // Get default instance (usually 'Regular') if available
    const defaultInstance =
      fontInfo.instances && fontInfo.instances.length > 0
        ? fontInfo.instances[0]
        : { name: { en: "Regular" }, coordinates: {} };

    const fontData = {
      family: fontInfo.name,
      features: featureStates,
      axes: axisValues,
      instance: defaultInstance.name?.en || "Regular",
      instanceData: defaultInstance.coordinates || {},
    };

    // Add detailed logging
    console.group(`Font Selected: ${fontInfo.name}`);
    console.log("Font Info:", fontInfo);
    console.log("Initial Font Data:", fontData);
    console.groupEnd();

    updateFontCardSelection(card);

    // Dispatch custom event for font selection
    const event = new CustomEvent("font-selected", {
      detail: {
        fontData,
        fontInfo: {
          ...fontInfo,
          availableFeatures: fontInfo.features || [],
          availableAxes: fontInfo.axes || {},
          availableInstances: fontInfo.instances || [],
        },
      },
    });
    document.dispatchEvent(event);
  });

  // Append to specified parent instead of fontListElement
  parentElement.appendChild(card);

  return card;
}

function scrollToFont(fontFamily) {
  const fontCard = Array.from(
    fontListElement.querySelectorAll(".font-card")
  ).find(
    (card) => card.querySelector(".font-card__name").textContent === fontFamily
  );

  if (fontCard) {
    // Update the selection state
    updateFontCardSelection(fontCard);

    // Get the font list container's dimensions
    const container = fontListElement;
    const containerHeight = container.clientHeight;

    // Calculate the scroll position to center the card
    const cardTop = fontCard.offsetTop;
    const cardHeight = fontCard.offsetHeight;
    const scrollTop = cardTop - containerHeight / 2 + cardHeight / 2;

    // Smooth scroll to the calculated position
    container.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
  }
}

// Modify the updateFontCardSelection function
function updateFontCardSelection(selectedCard) {
  document
    .querySelectorAll(".font-card")
    .forEach((card) => card.classList.toggle("active", card === selectedCard));
  selectedFontCard = selectedCard;
}

// Add a new function to get the selected font data
function getSelectedFontData() {
  if (!selectedFontCard) return null;

  const fontName =
    selectedFontCard.querySelector(".font-card__name").textContent;
  const fontInfo = fonts.get(fontName);

  if (!fontInfo) return null;

  // Get default instance
  const defaultInstance =
    fontInfo.instances && fontInfo.instances.length > 0
      ? fontInfo.instances[0]
      : { name: { en: "Regular" }, coordinates: {} };

  // Create initial feature states
  const featureStates = {};
  if (fontInfo.features && Array.isArray(fontInfo.features)) {
    fontInfo.features.forEach((feature) => {
      featureStates[feature] = false;
    });
  }

  // Create initial axis values
  const axisValues = {};
  if (fontInfo.axes) {
    Object.entries(fontInfo.axes).forEach(([tag, axis]) => {
      axisValues[tag] = axis.default;
    });
  }

  return {
    family: fontInfo.name,
    features: featureStates,
    axes: axisValues,
    instance: defaultInstance.name?.en || "Regular",
    instanceData: defaultInstance.coordinates || {},
  };
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
      return value === false;
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
  console.log("data", data)
  if (data.size != null) {
    // Add font size slider section (add this before the features section)
    const fontSizeSection = document.createElement("div");
    fontSizeSection.className = "settings-section font-size-section";

    // Get current font size from styles or use default
    const currentSize = parseInt(data.size);

    fontSizeSection.innerHTML = `
    <h3>Font Size</h3>
    <div class="font-size-control">
      <div class="axis-header">
        <label>Size</label>
        <span class="axis-value">${currentSize}px</span>
      </div>
      <input type="range" 
        data-axis="fontSize"
        min="12"
        max="400"
        value="${currentSize}"
        step="1"
        class="master-slider">
    </div>
  `;
    settingsPanel.appendChild(fontSizeSection);

    // Update the slider's visual state using the shared function
    updateFontSizeSlider(currentSize);
  }

  // Add this right after the font size section in updateSettingsPanel function
  if (data.size != null) {
    // ...existing font size section code...

    // Add text formatting section
    const textFormattingSection = document.createElement('div');
    textFormattingSection.className = 'settings-section text-formatting-section';
    textFormattingSection.innerHTML = `
      <h3>Text Formatting</h3>
      <div class="formatting-controls">
        <div class="button-group alignment-controls">
          <button class="icon-button active" data-format="align" data-value="left" title="Align Left">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M1 1h14v2H1V1zm0 4h10v2H1V5zm0 4h14v2H1V9zm0 4h10v2H1v-2z"/>
            </svg>
          </button>
          <button class="icon-button" data-format="align" data-value="center" title="Center">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M1 1h14v2H1V1zm2 4h10v2H3V5zM1 9h14v2H1V9zm2 4h10v2H3v-2z"/>
            </svg>
          </button>
          <button class="icon-button" data-format="align" data-value="right" title="Align Right">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M1 1h14v2H1V1zm4 4h10v2H5V5zM1 9h14v2H1V9zm4 4h10v2H5v-2z"/>
            </svg>
          </button>
          <button class="icon-button" data-format="align" data-value="justify" title="Justify">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M1 1h14v2H1V1zm0 4h14v2H1V5zm0 4h14v2H1V9zm0 4h14v2H1v-2z"/>
            </svg>
          </button>
        </div>
        <div class="button-group style-controls">
          <button class="icon-button" data-format="italic" title="Italic">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M11.5 2h-4L7 3h1.5l-2 10H5l-.5 1h4l.5-1H7.5l2-10H11l.5-1z"/>
            </svg>
          </button>
          <button class="icon-button" data-format="underline" title="Underline">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M3 2v5.5c0 2.5 2 4.5 5 4.5s5-2 5-4.5V2h-2v5.5c0 1.4-1.1 2.5-3 2.5s-3-1.1-3-2.5V2H3zm-1 11h12v1H2v-1z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    settingsPanel.appendChild(textFormattingSection);

    // Add active states based on current styles
    if (data.currentStyles) {
      const { textAlign, fontStyle, textDecoration } = data.currentStyles;
      
      // Set default to left align if no alignment is specified
      if (textAlign) {
        const alignButton = textFormattingSection.querySelector(`[data-format="align"][data-value="${textAlign}"]`);
        if (alignButton) {
          textFormattingSection.querySelectorAll('[data-format="align"]')
            .forEach(btn => btn.classList.remove('active'));
          alignButton.classList.add('active');
        }
      }
      
      if (fontStyle === 'italic') {
        textFormattingSection.querySelector('[data-format="italic"]')?.classList.add('active');
      }
      
      if (textDecoration === 'underline') {
        textFormattingSection.querySelector('[data-format="underline"]')?.classList.add('active');
      }
    }
  }

  // Update the features section HTML in updateSettingsPanel
  if (data.features && data.features.length > 0) {
    const featuresSection = document.createElement("div");
    featuresSection.className = "settings-section features-section";
    featuresSection.innerHTML = `
      <h3>OpenType Features</h3>
      <div class="feature-toggles two-columns">
        ${data.features
          .map(
            (feature) => `
          <label class="feature-toggle">
            <input class="feature-checkbox" 
                   type="checkbox"
                   data-feature="${feature}"
                   ${data.currentFeatures[feature] ? "checked" : ""}>
            <span class="feature-toggle__label">
              <span class="feature-toggle__name">${feature}</span>
            </span>
          </label>
        `
          )
          .join("")}
      </div>
    `;
    settingsPanel.appendChild(featuresSection);
  }

  // Update the axes section in updateSettingsPanel function
  if (Object.keys(data.axes).length > 0) {
    // Only show axes section if there are multiple weights or other axes
    // Don't show the section if it's only weight axis with no range
    const hasMultipleValues = Object.entries(data.axes).some(([tag, axis]) => {
      // If min and max are the same, the axis has only one possible value
      return axis.min !== axis.max;
    });

    if (hasMultipleValues) {
      const axesSection = document.createElement("div");
      axesSection.className = "settings-section axes-section";

      axesSection.innerHTML = `
        <h3>Variable Axes</h3>
        <div class="axes-list">
          ${Object.entries(data.axes)
            .map(([tag, axis]) => {
              // Skip axes that don't have a range
              if (axis.min === axis.max) return '';
              
              const currentValue = data.currentAxes[tag] || axis.default;
              const percentage =
                ((currentValue - axis.min) / (axis.max - axis.min)) * 100;

              return `
              <div class="axis-control">
                <div class="axis-header">
                  <label>${tag === "wght" ? "Weight" : axis.name}</label>
                  <span class="axis-value">${currentValue}</span>
                </div>
                <input type="range" 
                  data-axis="${tag}"
                  min="${axis.min}"
                  max="${axis.max}"
                  value="${currentValue}"
                  step="1"
                  class="master-slider"
                  style="--split-percent: ${percentage}%">
              </div>`;
            })
            .join("")}
        </div>
      `;
      settingsPanel.appendChild(axesSection);
    }
  }

  // Add instances section if available and more than one instance
  if (data.instances && data.instances.length > 1) {
    const instancesSection = document.createElement("div");
    instancesSection.className = "settings-section instances-section";
    instancesSection.innerHTML = `
      <h3>Instances</h3>
      <div class="instances-list">
        ${data.instances
          .map((instance) => {
            const displayName = instance.name.en;
            return `
              <button class="instance-button ${
                data.currentInstance === instance.name.en ? "active" : ""
              }"
                      data-instance="${instance.name.en}">
                ${displayName}
              </button>
            `;
          })
          .join("")}
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
    const valueDisplay = slider.parentElement.querySelector(".axis-value");

    slider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      const min = parseFloat(e.target.min);
      const max = parseFloat(e.target.max);
      const percentage = ((value - min) / (max - min)) * 100;

      // Update the split percentage CSS variable
      e.target.style.setProperty("--split-percent", `${percentage}%`);

      // Update the value display with 'px' for font size
      if (e.target.dataset.axis === "fontSize") {
        valueDisplay.textContent = `${value}px`;
      } else {
        valueDisplay.textContent = value;
      }

      const event = new CustomEvent("settings-changed", {
        detail: {
          type: e.target.dataset.axis === "fontSize" ? "fontSize" : "axis",
          name: e.target.dataset.axis,
          value: value,
          textbox: state.activeTextbox,
        },
      });
      document.dispatchEvent(event);
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
      panel
        .querySelectorAll(".instance-button")
        .forEach((btn) => btn.classList.remove("active"));
      // Add active class to clicked button
      button.classList.add("active");

      const event = new CustomEvent("settings-changed", {
        detail: {
          type: "instance",
          name: button.dataset.instance,
          value: button.dataset.instance,
          textbox: state.activeTextbox,
        },
      });
      document.dispatchEvent(event);
    });
  });

  // Add this in setupSettingsEventListeners function
  // Format buttons (alignment, italic, underline)
  panel.querySelectorAll('.icon-button[data-format]').forEach(button => {
    button.addEventListener('click', e => {
      const format = e.target.closest('button').dataset.format;
      const value = e.target.closest('button').dataset.value;
      
      // Handle alignment buttons group
      if (format === 'align') {
        panel.querySelectorAll('[data-format="align"]')
          .forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      } else {
        // Toggle active state for other buttons
        button.classList.toggle('active');
      }

      const detail = {
        type: 'format',
        format: format,
        value: format === 'align' ? value : button.classList.contains('active'),
        textbox: state.activeTextbox
      };

      document.dispatchEvent(new CustomEvent('settings-changed', { detail }));
    });
  });
}

// Add CSS for sections
const style = document.createElement("style");
style.textContent = `

  .font-list-section__title {
    padding: 1rem;
    margin: 0;
    font-size: 0.875rem;
    color: var(--light-gray);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .local-fonts {
    border-bottom: 1px solid var(--dark-gray);
  }
`;
document.head.appendChild(style);

// Add CSS for loading indicator
const lazyLoadStyles = document.createElement("style");
lazyLoadStyles.textContent = `
    .loading-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        color: var(--light-gray);
        gap: 0.5rem;
    }

    .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid var(--light-gray);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(lazyLoadStyles);

// Add to your existing style element or create a new one
const formattingStyles = document.createElement('style');
formattingStyles.textContent = `
  .formatting-controls {
    display: flex;
  }

  .button-group {
    display: flex;
    gap: 0.25rem;
  }

  .icon-button {
    width: 32px;
    height: 32px;
    padding: 0.5rem;
    border: 1px solid var(--dark-gray);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .icon-button:hover {
    background: var(--hover-bg);
  }

  .icon-button.active {
    background: var(--accent-color);
    border-color: var(--accent-color);
  }

  .icon-button.active svg path {
    fill: white;
  }

  .icon-button svg {
    width: 16px;
    height: 16px;
  }

  .icon-button svg path {
    fill: currentColor;
  }

  .alignment-controls {
    display: flex;
    gap: 0.25rem;
    margin-right: 4px;
  }

  .alignment-controls .icon-button {
    min-width: 32px; /* Ensure consistent width */
  }
`;
document.head.appendChild(formattingStyles);

// Add the search input HTML and styles
const searchStyles = document.createElement('style');
searchStyles.textContent = `
  .font-search {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 1rem;
    background: var(--tblack2);
    border-bottom: 1px solid var(--dark-gray);
  }

  .font-search__input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--dark-gray);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text);
    font-size: 0.875rem;
  }

  .font-search__input:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  /* Add styles for no results message */
  .no-results {
    padding: 2rem;
    text-align: center;
    color: var(--light-gray);
  }
`;
document.head.appendChild(searchStyles);

export {
  init as initFontManager,
  updateSettingsPanel,
  scrollToFont,
  updateFontCardSelection,
  getSelectedFontData, // Add this export
};

export function updateFontSizeSlider(newSize) {
  const fontSizeSlider = document.querySelector('input[data-axis="fontSize"]');
  if (fontSizeSlider) {
    // Update slider value and visual state
    fontSizeSlider.value = newSize;
    const percentage = ((newSize - 12) / (400 - 12)) * 100;
    fontSizeSlider.style.setProperty("--split-percent", `${percentage}%`);

    // Update the value display
    const valueDisplay =
      fontSizeSlider.parentElement.querySelector(".axis-value");
    if (valueDisplay) {
      valueDisplay.textContent = `${Math.round(newSize)}px`;
    }
  }
}
