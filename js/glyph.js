function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  // Calculate header heights
  //const firstHeaderHeight = document.querySelector("header").offsetHeight || 0;
  const secondHeaderHeight =
    document.querySelector(".second-header").offsetHeight || 0;

  // Total offset
  //const offset = firstHeaderHeight + secondHeaderHeight;

  // Get the position of the section relative to the top of the document
  const sectionPosition =
    section.getBoundingClientRect().top + window.pageYOffset - 10;

  // Subtract the offset from the section position
  const offsetPosition = sectionPosition - secondHeaderHeight;

  // Smooth scroll to the adjusted position
  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

// Make the function globally available
window.scrollToSection = scrollToSection;

// ========================================
// Font Data Fetching and Loading
// ========================================

import { GoogleFontsLoader } from "./modules/google-fonts-loader.js";

// Global loader instance
let fontLoader;
let fontFamily;
let variantObjects = [];
let fontData;

async function initFontLoader() {
  // Initialize the font loader from JSON data
  fontLoader = await GoogleFontsLoader.fromJson("/data/fontinfo.json");
  return fontLoader;
}

// 1. Optimize font loading
async function loadFonts(fontFamily) {
  try {
    return await fontLoader.loadFont(fontFamily);
  } catch (error) {
    console.error(`Error loading font: ${fontFamily}`, error);
    return false;
  }
}

// ========================================
// Variant Card Creation and Display
// ========================================

function createVariantCard(variant, fontFamily) {
  const card = document.createElement("div");
  card.classList.add("variant-card");

  const variantName = document.createElement("h3");
  variantName.innerText = fontLoader.translateWeightToName(variant);
  variantName.classList.add("text-sm", "text-white");

  const sampleText = document.createElement("p");
  sampleText.innerText = "Sample Text";
  sampleText.style.fontFamily = `${fontFamily}`;
  sampleText.style.fontWeight = variant.replace("italic", "") || "400";
  sampleText.style.fontStyle = variant.includes("italic") ? "italic" : "normal";
  sampleText.classList.add(
    "sample-text",
    "text-8xl",
    "mt-4",
    "mb-4",
    "outline-none"
  );
  sampleText.contentEditable = true;

  card.appendChild(variantName);
  card.appendChild(sampleText);

  return card;
}

// 2. Optimize variant card creation
function displayVariantCards(fontData) {
  console.log("Displaying variant cards for:", fontData);
  const fragment = document.createDocumentFragment();
  console.log("Variant objects:", variantObjects);

  // Use variant objects or fall back to old variant strings
  const variantsToDisplay =
    variantObjects.length > 0
      ? variantObjects.map((obj) => ({
          variant: obj.weight + (obj.style === "italic" ? "italic" : ""),
          family: fontFamily,
        }))
      : (fontData.variants || []).map((variant) => ({
          variant,
          family: fontFamily,
        }));

  variantsToDisplay.forEach(({ variant, family }) => {
    fragment.appendChild(createVariantCard(variant, family));
  });

  document.querySelector(".styles-list").appendChild(fragment);
}

// ========================================
// Event Listeners for Demo Text and Buttons
// ========================================

document.getElementById("demoText").addEventListener("input", function () {
  const sampleTextElements = document.querySelectorAll(".sample-text");
  sampleTextElements.forEach((element) => {
    element.textContent = this.value;
  });
});

document.getElementById("citiesDemoBtn").addEventListener("click", function () {
  const sampleTexts = document.querySelectorAll(".sample-text");
  const cityName = getRandomCity();
  sampleTexts.forEach(function (element) {
    element.textContent = cityName;
  });
});

document
  .getElementById("defaultDemoBtn")
  .addEventListener("click", function () {
    const sampleTexts = document.querySelectorAll(".sample-text");
    sampleTexts.forEach(function (element) {
      element.textContent = fontFamily;
    });
  });

const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "London", "Paris", "Tokyo", "Beijing", "Moscow", "Sydney", "Dubai", "Rome", "Berlin", "Madrid", "Toronto", "Vancouver", "Mexico City", "Buenos Aires", "São Paulo", "Cairo", "Istanbul", "Mumbai", "Bangkok", "Seoul", "Hong Kong", "Singapore", "Kuala Lumpur", "Jakarta", "Lagos"];

function getRandomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

// ========================================
// Master Slider Functionality
// ========================================

const masterSlider = document.querySelector(".master-slider");
const sliderValue = document.getElementById("sliderValue");

masterSlider.addEventListener("input", (e) => {
  const size = parseInt(e.target.value);
  sliderValue.textContent = `${size} px`;

  // Update all sample text elements
  const sampleTextElements = document.querySelectorAll(".sample-text");
  sampleTextElements.forEach((element) => {
    element.style.fontSize = `${size}px`;
    element.style.lineHeight = `${size * 1.4}px`;
  });
  updateSliderVisual(masterSlider, size);
});

export function updateSliderVisual(sliderElement, size) {
  if (!sliderElement) return;

  // Set the slider value
  sliderElement.value = size;

  // Calculate the percentage for visual styling
  const percent = ((size - 12) / (210 - 12)) * 100;

  // Use the CSS variable instead of inline style
  sliderElement.style.setProperty("--split-percent", `${percent}%`);
}

// ========================================
// Initialization Functions
// ========================================

async function initFontProfile() {
  // Initialize font loader first
  await initFontLoader();

  // Extract the font parameter from the URL
  const urlParams = new URLSearchParams(window.location.search);
  fontFamily = urlParams.get("font");

  if (fontFamily) {
    fontData = fontLoader.getFont(fontFamily);
    variantObjects = await fontLoader.getFontVariants(fontFamily);
    // Update the font-name and font-title elements
    const fontNameElement = document.querySelector(".font-name");
    const fontTitleElement = document.querySelector(".font-title-name");
    const fontDesigner = document.querySelector(".font-designer");
    // Set up the save button to link to Google Fonts
    const saveButton = document.querySelector("a[href='#archive']");
    if (saveButton) {
      const encodedFontName = encodeURIComponent(fontFamily);
      saveButton.href = `https://fonts.google.com/specimen/${encodedFontName}`;
      saveButton.target = "_blank"; // Open in new tab
    }

    // Load fonts
    await loadFonts(fontFamily);
    // Apply the font family
    fontTitleElement.style.fontFamily = fontFamily;
    fontNameElement.textContent = fontFamily;
    fontDesigner.innerHTML = '<span style="color:var(--gray);">Designed by </span>' + fontData.designer;
    fontTitleElement.textContent = fontFamily;

    // Create a static SVG version of the glyphs for better rendering
    setupStaticGlyphRendering(fontFamily);
    
    // Display variant cards
    displayVariantCards(fontData);

    // Set initial sample text to the font family name
    const sampleTextElements = document.querySelectorAll(".sample-text");
    sampleTextElements.forEach((element) => {
      element.textContent = fontFamily;
    });
    // Display font details in a cleaner, simplified format
    displayFontDetails(fontData);
  } else {
    console.error(`Font family "${fontFamily}" not found`);
  }
}

// 3. Optimize grid creation with a helper function
function initGlyphGrid() {
  const glyphGrid = document.querySelector(".glyph-grid");
  glyphGrid.innerHTML = "";
  glyphGrid.style.display = "block";

  const glyphLetter = document.querySelector(".glyph-letter");
  glyphLetter.style.fontFamily = fontFamily;

  // Single event delegation for all cells
  glyphGrid.addEventListener("click", (event) => {
    const cell = event.target.closest(".grid-cell");
    if (!cell) return;

    const previouslySelected = glyphGrid.querySelector(".grid-cell.selected");
    if (previouslySelected) previouslySelected.classList.remove("selected");
    cell.classList.add("selected");

    // Update SVG with the letter
    const letter = cell.textContent;
    const svgText = glyphLetter.querySelector("text");
    if (svgText) {
      svgText.textContent = letter;
      updateLetterName(letter);
    }
  });

  // Define all sections to create with their character ranges
  const sections = [
    {
      id: "uppercase",
      title: "Uppercase",
      ranges: [[65, 90]], // A-Z
      defaultSelected: 65, // 'A'
    },
    {
      id: "lowercase",
      title: "Lowercase",
      ranges: [[97, 122]], // a-z
    },
    {
      id: "numerals",
      title: "Numerals",
      ranges: [[48, 57]], // 0-9
    },
    {
      id: "punctuation",
      title: "Punctuation",
      ranges: [
        [33, 47], // ! to /
        [58, 64], // : to @
        [91, 96], // [ to `
        [123, 126], // { to ~
      ],
    },
    {
      id: "latin-extended",
      title: "Latin Extended",
      ranges: [
        [192, 214], // À to Ö
        [216, 246], // Ø to ö
        [248, 255], // ø to ÿ
      ],
    },
    {
      id: "special-chars",
      title: "Special Characters",
      ranges: [
        [161, 191], // ¡ to ¿
        [8211, 8230], // – to …
      ],
    },
    {
      id: "math",
      title: "Math Symbols",
      ranges: [
        [177, 177], // ±
        [215, 215], // ×
        [247, 247], // ÷
        [8722, 8722], // −
        [8734, 8734], // ∞
        [8776, 8776], // ≈
        [8800, 8804], // ≠ to ≤
      ],
    },
    {
      id: "currency",
      title: "Currency",
      ranges: [
        [36, 36], // $
        [162, 165], // ¢ to ¥
        [8364, 8364], // €
        [8369, 8369], // ₁
        [8372, 8377], // ₴ to ₹
      ],
    },
  ];

  // Create all sections using the common helper
  sections.forEach((section) => {
    const sectionElem = createSection(section.id, section.title);
    const grid = createGrid(10);

    // Populate grid with characters from all ranges
    let hasVisibleCharacters = false;

    section.ranges.forEach(([start, end]) => {
      for (let i = start; i <= end; i++) {
        try {
          const char = String.fromCharCode(i);
          const cell = createCell(char, fontFamily);
          if (i === section.defaultSelected) cell.classList.add("selected");
          grid.appendChild(cell);
          hasVisibleCharacters = true;
        } catch (e) {
          console.warn(`Could not create character for code point: ${i}`);
        }
      }
    });

    if (hasVisibleCharacters) {
      sectionElem.appendChild(grid);
      glyphGrid.appendChild(sectionElem);
    }
  });

  // Set initial preview
  const svgText = glyphLetter.querySelector("text");
  if (svgText) {
    svgText.textContent = "A";
    updateLetterName("A");
  }

  // Initially show only basic sections
  toggleGlyphSections("basic");
}

/**
 * Helper function to create a section container
 * @param {string} id - Section identifier
 * @param {string} title - Section title
 * @returns {HTMLElement} - Section container
 */
function createSection(id, title) {
  const section = document.createElement("div");
  section.setAttribute("data-section", id);

  const heading = document.createElement("h3");
  heading.className = "section-heading";
  heading.textContent = title;

  section.appendChild(heading);
  return section;
}

/**
 * Helper function to create a grid container
 * @param {number} columns - Number of columns
 * @returns {HTMLElement} - Grid container
 */
function createGrid(columns) {
  const grid = document.createElement("div");
  grid.className = "glyph-section-grid";
  return grid;
}

/**
 * Helper function to create a grid cell
 * @param {string} char - Character to display
 * @param {string} fontFamily - Font family to use
 * @returns {HTMLElement} - Grid cell
 */
function createCell(char, fontFamily) {
  const cell = document.createElement("div");
  cell.classList.add("grid-cell");
  cell.textContent = char;
  cell.style.fontFamily = fontFamily;
  return cell;
}

// Simplified control section - single row layout
function initControlSection() {
  const glyphControl = document.querySelector(".glyph-control");
  glyphControl.innerHTML = "";

  // Create a single row container with flexbox
  const controlRow = document.createElement("div");
  controlRow.className = "control-row";
  controlRow.style.display = "flex";
  controlRow.style.width = "100%";
  controlRow.style.alignItems = "center";
  controlRow.style.gap = "1rem";

  // ---- Left Side Container (50% width) ----
  const leftContainer = document.createElement("div");
  leftContainer.className = "left-controls-container";
  leftContainer.style.display = "flex";
  leftContainer.style.alignItems = "center";
  leftContainer.style.gap = "1rem";
  leftContainer.style.width = "50%"; // Match the right side width

  // ---- 1. Letter Name Display (Left Side) ----
  const letterNameContainer = document.createElement("div");
  letterNameContainer.className = "letter-name";
  letterNameContainer.id = "letterName";
  letterNameContainer.style.flex = "1"; // Take available space in left container

  // ---- 2. Solid/Outline Toggle (Now on left side) ----
  const renderModeContainer = document.createElement("div");
  renderModeContainer.className = "render-mode";

  const renderModeLabel = document.createElement("span");
  renderModeLabel.textContent = "Mode:";
  renderModeLabel.className = "mode-label";

  const toggleContainer = document.createElement("div");
  toggleContainer.className = "toggle-container";

  const solidBtn = document.createElement("button");
  solidBtn.id = "solidBtn";
  solidBtn.textContent = "Solid";
  solidBtn.className = "mode-button active";

  const outlineBtn = document.createElement("button");
  outlineBtn.id = "outlineBtn";
  outlineBtn.textContent = "Outline";
  outlineBtn.className = "mode-button";

  toggleContainer.appendChild(solidBtn);
  toggleContainer.appendChild(outlineBtn);
  renderModeContainer.appendChild(renderModeLabel);
  renderModeContainer.appendChild(toggleContainer);

  // Add items to left container
  leftContainer.appendChild(letterNameContainer);
  leftContainer.appendChild(renderModeContainer);

  // ---- Right Controls Container (50% width) ----
  const rightControlsContainer = document.createElement("div");
  rightControlsContainer.className = "right-controls-container";
  rightControlsContainer.style.display = "flex";
  rightControlsContainer.style.justifyContent = "space-between"; // Space items evenly
  rightControlsContainer.style.alignItems = "center";
  rightControlsContainer.style.width = "50%"; // Exact 50% width

  // ---- 3. Style Selection Dropdown ----

  // Create custom dropdown container
  const customDropdownContainer = document.createElement("div");
  customDropdownContainer.className = "variantDropdown relative ml-32";
  customDropdownContainer.id = "fontStyleDropdown";

  rightControlsContainer.appendChild(customDropdownContainer);

  // ---- 4. Basic/Full Set Toggle ----
  const glyphSetContainer = document.createElement("div");
  glyphSetContainer.className = "glyph-set";

  const glyphSetLabel = document.createElement("span");
  glyphSetLabel.textContent = "Glyphs:";
  glyphSetLabel.className = "glyph-set-label";

  const glyphSetToggle = document.createElement("div");
  glyphSetToggle.className = "glyph-set-toggle";

  const basicBtn = document.createElement("button");
  basicBtn.id = "basicGlyphsBtn";
  basicBtn.textContent = "Basic";
  basicBtn.className = "glyph-set-button active";

  const fullBtn = document.createElement("button");
  fullBtn.id = "fullGlyphsBtn";
  fullBtn.textContent = "Full Set";
  fullBtn.className = "glyph-set-button";

  glyphSetToggle.appendChild(basicBtn);
  glyphSetToggle.appendChild(fullBtn);
  glyphSetContainer.appendChild(glyphSetLabel);
  glyphSetContainer.appendChild(glyphSetToggle);

  // Add controls to the right container
  rightControlsContainer.appendChild(glyphSetContainer);

  // Add main sections to control row
  controlRow.appendChild(leftContainer);
  controlRow.appendChild(rightControlsContainer);

  // Add control row to the main container
  glyphControl.appendChild(controlRow);

  // Set initial letter name with Unicode properly
  updateLetterName("A");

  // ----- Event Handlers -----
  // Solid/Outline toggle
  solidBtn.addEventListener("click", () => {
    solidBtn.classList.add("active");
    outlineBtn.classList.remove("active");

    const svgText = document.querySelector(".glyph-letter svg text");
    if (svgText) {
      svgText.setAttribute("fill", "white");
      svgText.removeAttribute("stroke");
      svgText.removeAttribute("stroke-width");
      svgText.removeAttribute("paint-order");
    }
  });

  outlineBtn.addEventListener("click", () => {
    outlineBtn.classList.add("active");
    solidBtn.classList.remove("active");

    const svgText = document.querySelector(".glyph-letter svg text");
    if (svgText) {
      // Use basic SVG stroke properties for outline
      svgText.setAttribute("fill", "transparent"); // Make the inside transparent
      svgText.setAttribute("stroke", "white"); // White outline
      svgText.setAttribute("stroke-width", "1"); // Thickness of the outline
      svgText.setAttribute("paint-order", "stroke"); // Draw stroke first, then fill
    }
  });

  // Glyph set toggle (basic/full)
  basicBtn.addEventListener("click", () => {
    basicBtn.classList.add("active");
    fullBtn.classList.remove("active");

    // Show only basic sections
    toggleGlyphSections("basic");
    scrollToSection("glyph-section");
  });

  fullBtn.addEventListener("click", () => {
    fullBtn.classList.add("active");
    basicBtn.classList.remove("active");

    // Show all sections
    toggleGlyphSections("full");
  });

  // Populate custom dropdown and set up events
  createAndSetupFontStyleDropdown(customDropdownContainer);
}

/**
 * Creates and sets up the custom font style dropdown
 * @param {HTMLElement} container - The container for the dropdown
 */
function createAndSetupFontStyleDropdown(container) {
  // Create the dropdown HTML
  container.innerHTML = createCustomVariantDropdownHTML();

  // Set up event listeners for the dropdown
  setupCustomVariantDropdown(container);
}

/**
 * Creates HTML structure for the custom variant dropdown
 * @returns {string} HTML structure for dropdown
 */
function createCustomVariantDropdownHTML() {
  // Generate a unique ID for radio group
  const radioGroupName = `variant-${Math.random().toString(36).substr(2, 9)}`;
  let optionsHTML = '';
  
  // If we have variant objects from the font loader, use them
  if (variantObjects && variantObjects.length > 0) {
    // First find the regular variant (400 normal) to set as default
    const defaultIndex = variantObjects.findIndex(v => 
      v.weight === 400 && v.style === 'normal'
    ) || 0;
    
    // Generate HTML for regular variants
    const regularVariants = variantObjects.filter(v => v.style === "normal");
    regularVariants.forEach((variant, index) => {
      const isDefault = variant.weight === 400 && variant.style === 'normal';
      optionsHTML += `<label class="block px-2 py-2">
        <input type="radio" name="${radioGroupName}" 
          data-weight="${variant.weight}" 
          data-style="normal"
          value="${variant.weight}" 
          ${isDefault ? 'checked' : ''}>
        ${fontLoader.translateWeightToName(variant.weight.toString())}
      </label>`;
    });
    
    // Add separator if we have both regular and italic variants
    const italicVariants = variantObjects.filter(v => v.style === "italic");
    if (regularVariants.length > 0 && italicVariants.length > 0) {
      optionsHTML += `<label class="block px-2 py-2 disabled">
        <div>──────────</div>
      </label>`;
    }
    
    // Generate HTML for italic variants
    italicVariants.forEach((variant) => {
      optionsHTML += `<label class="block px-2 py-2">
        <input type="radio" name="${radioGroupName}" 
          data-weight="${variant.weight}" 
          data-style="italic"
          value="${variant.weight}italic">
        ${fontLoader.translateWeightToName(variant.weight + "italic")}
      </label>`;
    });
  } else {
    // Fallback for when no variants are available
    optionsHTML = `<label class="block px-2 py-2">
      <input type="radio" name="${radioGroupName}" 
        data-weight="400" 
        data-style="normal"
        value="regular" checked>
      Regular
    </label>`;
  }
  
  // Return complete dropdown HTML structure
  return `
    <button type="button" class="dropdown-button relative z-40 text-white 
            transition-all duration-200 flex items-center gap-2">
      <span>Regular</span>
      <span class="ml-1 text-xl dd-triangle">▾</span>
    </button>
    <div class="absolute pl-2 transition-all duration-200 ease-in-out 
              opacity-0 invisible w-full z-20 overflow-hidden dropdown-content block-control">
      <div class="dropdown-content-wrapper overflow-y-auto" 
           style="margin-top: 40px; max-height: 150px;">
        <div class="pr-2">
          ${optionsHTML}
        </div>
      </div>
    </div>
  `;
}

/**
 * Sets up event handlers for the custom variant dropdown
 * @param {HTMLElement} dropdown - The dropdown container
 */
function setupCustomVariantDropdown(dropdown) {
  if (!dropdown) return;
  
  let isDropdownVisible = false;
  const button = dropdown.querySelector('.dropdown-button');
  const dropdownContent = dropdown.querySelector('.dropdown-content');
  
  // Button click handler to toggle dropdown
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    isDropdownVisible = !isDropdownVisible;
    
    if (isDropdownVisible) {
      dropdown.classList.add("dropdown-open");
      showDropdownContent(dropdown);
    } else {
      dropdown.classList.remove("dropdown-open");
      hideDropdownContent(dropdown);
    }
  });

  // Click outside to close
  document.addEventListener("click", (e) => {
    if (isDropdownVisible && !dropdown.contains(e.target)) {
      isDropdownVisible = false;
      dropdown.classList.remove("dropdown-open");
      hideDropdownContent(dropdown);
    }
  });

  // Radio button change handler
  dropdown.addEventListener("change", (e) => {
    if (!e.target.matches('input[type="radio"]')) return;
    
    const weight = e.target.dataset.weight || "400";
    const style = e.target.dataset.style || "normal";
    const buttonText = dropdown.querySelector("button span:first-child");
    
    // Update button text with selected variant name
    buttonText.textContent = fontLoader.translateWeightToName(
      style === 'italic' ? `${weight}italic` : weight
    );
    
    // Apply the selected style to the glyph preview
    updateGlyphStyle(weight, style);
    
    // Close dropdown after selection
    isDropdownVisible = false;
    dropdown.classList.remove("dropdown-open");
    hideDropdownContent(dropdown);
  });
}

/**
 * Updates glyph preview with selected style
 * @param {string} weight - Font weight
 * @param {string} style - Font style (normal/italic)
 */
function updateGlyphStyle(weight, style) {
  const svgText = document.querySelector(".glyph-letter svg text");
  if (svgText) {
    svgText.style.fontWeight = weight;
    svgText.style.fontStyle = style;
  }
  
  // Also update all grid cells with the new style
  const gridCells = document.querySelectorAll(".grid-cell");
  gridCells.forEach(cell => {
    cell.style.fontWeight = weight;
    cell.style.fontStyle = style;
  });
}

/**
 * Shows dropdown content with animation
 * @param {HTMLElement} dropdown - The dropdown container
 */
function showDropdownContent(dropdown) {
  const button = dropdown.querySelector('.dropdown-button');
  const dropdownContent = dropdown.querySelector('.dropdown-content');
  const triangle = button.querySelector('.dd-triangle');
  
  button.style.backgroundColor = "transparent";
  dropdownContent.classList.add("opacity-100", "visible", "border", "border-[#4F4F4F]");
  dropdownContent.classList.remove("opacity-0", "invisible");
  triangle.classList.add("rotate-triangle");
}

/**
 * Hides dropdown content with animation
 * @param {HTMLElement} dropdown - The dropdown container
 */
function hideDropdownContent(dropdown) {
  const button = dropdown.querySelector('.dropdown-button');
  const dropdownContent = dropdown.querySelector('.dropdown-content');
  const triangle = button.querySelector('.dd-triangle');
  
  button.style.backgroundColor = "";
  dropdownContent.classList.remove("opacity-100", "visible", "border", "border-[#4F4F4F]");
  dropdownContent.classList.add("opacity-0", "invisible");
  triangle.classList.remove("rotate-triangle");
}

/**
 * Updates the letter name display in the controls based on the selected character
 */
function updateLetterName(char) {
  const letterName = document.getElementById("letterName");
  if (!letterName) return;

  // Get the character code
  const code = char.charCodeAt(0);
  const unicodeHex = code.toString(16).toUpperCase().padStart(4, "0");

  // Determine letter type
  let name = "";

  if (code >= 65 && code <= 90) {
    // A-Z
    name = `Capital Letter ${char}`;
  } else if (code >= 97 && code <= 122) {
    // a-z
    name = `Small Letter ${char.toUpperCase()}`;
  } else if (code >= 48 && code <= 57) {
    // 0-9
    name = `Number ${char}`;
  } else if (code >= 0x0100 && code <= 0x017f) {
    // Extended Latin
    name = `Extended Latin ${char}`;
  } else if (
    (code >= 0x0021 && code <= 0x002f) || // Punctuation and symbols
    (code >= 0x003a && code <= 0x0040) ||
    (code >= 0x005b && code <= 0x0060) ||
    (code >= 0x007b && code <= 0x007e)
  ) {
    name = `Symbol ${char}`;
  } else {
    name = `Character ${char}`;
  }

  // Clear existing content
  letterName.innerHTML = "";

  // Create main text node
  const nameText = document.createTextNode(name);
  letterName.appendChild(nameText);

  // Create Unicode display
  const unicodeSpan = document.createElement("span");
  unicodeSpan.className = "unicode-value";
  unicodeSpan.textContent = ` U+${unicodeHex}`;
  letterName.appendChild(unicodeSpan);
}

/**
 * Updates the font weight and style when changed in the dropdown
 */
function updateFontStyle() {
  const styleSelect = document.getElementById("fontStyle");
  if (!styleSelect) return;

  const selectedOption = styleSelect.options[styleSelect.selectedIndex];
  if (!selectedOption) return;

  const svgText = document.querySelector(".glyph-letter svg text");
  if (!svgText) return;

  // Extract weight and style from the selected option
  const weight = selectedOption.dataset.weight || "400";
  const fontStyle = selectedOption.dataset.style || "normal";

  // Update the text element's style
  svgText.style.fontWeight = weight;
  svgText.style.fontStyle = fontStyle;
}

/**
 * Toggles the visibility of glyph grid sections based on the selected mode
 * @param {string} mode - "basic" or "full"
 */
function toggleGlyphSections(mode) {
  const glyphGrid = document.querySelector(".glyph-grid");
  if (!glyphGrid) return;

  // Get all sections
  const sections = glyphGrid.querySelectorAll("div[data-section]");

  // Show/hide sections based on mode
  sections.forEach((section) => {
    const sectionType = section.getAttribute("data-section");

    if (mode === "basic") {
      // Only show uppercase, lowercase, and numerals in basic mode
      section.style.display =
        sectionType === "uppercase" ||
        sectionType === "lowercase" ||
        sectionType === "numerals"
          ? "block"
          : "none";
      //scrollToSection("glyph-section");
    } else {
      // Show all sections in full mode
      section.style.display = "block";
    }
  });
}

/**
 * Populates the font style options in the dropdown based on the available variants
 * Combines weight and italic information into a single dropdown
 * @param {HTMLSelectElement} styleSelect - The select element to populate
 */
async function populateFontStyleOptions(styleSelect) {
  if (!fontFamily) return;

  // Clear existing options
  styleSelect.innerHTML = "";

  if (variantObjects.length > 0) {
    // Group variants by weight and style
    const regularVariants = variantObjects.filter((v) => v.style === "normal");
    const italicVariants = variantObjects.filter((v) => v.style === "italic");

    // First add all regular styles
    regularVariants.forEach((variant) => {
      const option = document.createElement("option");
      option.value =
        variant.weight + (variant.style === "italic" ? "italic" : "");
      option.dataset.weight = variant.weight;
      option.dataset.style = "normal";
      option.textContent =
        variant.display || fontLoader.translateWeightToName(variant.weight);
      styleSelect.appendChild(option);
    });

    // Add a separator if we have both styles
    if (regularVariants.length > 0 && italicVariants.length > 0) {
      const separator = document.createElement("option");
      separator.disabled = true;
      separator.textContent = "──────────";
      styleSelect.appendChild(separator);
    }

    // Then add all italic styles
    italicVariants.forEach((variant) => {
      const option = document.createElement("option");
      option.value = variant.weight + "italic";
      option.dataset.weight = variant.weight;
      option.dataset.style = "italic";
      option.textContent =
        variant.display ||
        fontLoader.translateWeightToName(variant.weight + "italic");
      styleSelect.appendChild(option);
    });
  } else {
    // If no variants found, add a default Regular option
    const option = document.createElement("option");
    option.value = "400";
    option.dataset.weight = "400";
    option.dataset.style = "normal";
    option.textContent = "Regular";
    styleSelect.appendChild(option);
  }

  // Select the first option by default
  if (styleSelect.options.length > 0) {
    styleSelect.selectedIndex = 0;
  }
}

// ========================================
// Font Metrics and Glyph Display Scaling
// ========================================

/**
 * Loads metrics for the current font and makes them available for other uses.
 * It retrieves the font file from the font data and uses opentype.js to extract
 * the metrics (cap height, x-height, descender)
 */
async function initFontMetrics() {
  if (!fontFamily) {
    console.error("No font family found in .font-name element.");
    return;
  }
  if (!fontData) {
    console.error(`Font family "${fontFamily}" not found`);
    return;
  }

  let fileUrl = fontData.files.regular;

  if (!fileUrl) {
    console.warn(
      `No font file URL found for "${fontFamily}". Using fallback metrics.`
    );
    const metrics = createFallbackMetrics(fontFamily, fontData);
    window.currentFontMetrics = metrics;
    updateGlyphPreview();
    return;
  }

  try {
    console.log("Attempting to load font file with OpenType.js:", fileUrl);
    opentype.load(fileUrl, function (err, loadedFont) {
      if (err) {
        console.error(
          `Error loading font "${fontFamily}" from ${fileUrl}:`,
          err
        );
        const metrics = createFallbackMetrics(fontFamily, fontData);
        window.currentFontMetrics = metrics;
        console.warn("Using fallback metrics due to font loading error");
        updateGlyphPreview();
        return;
      }

      console.log("Successfully loaded font with OpenType.js:", loadedFont);
      const unitsPerEm = loadedFont.unitsPerEm || 1000;
      let descender = loadedFont.descender;
      let xHeight = null;
      let capHeight = null;

      if (loadedFont.tables.os2) {
        const os2 = loadedFont.tables.os2;
        if (os2.sxHeight) xHeight = os2.sxHeight;
        if (os2.sCapHeight) capHeight = os2.sCapHeight;
        const winDescent = os2.usWinDescent;
        if (winDescent && winDescent > 0) descender = -winDescent;
        else if (os2.typoDescender) descender = os2.typoDescender;
      }

      if (!xHeight || xHeight <= 0) {
        try {
          const xGlyph = loadedFont.charToGlyph("x");
          if (xGlyph.getBoundingBox) {
            const bounds = xGlyph.getBoundingBox();
            xHeight = bounds.y2;
          } else {
            xHeight = Math.round(unitsPerEm * 0.5);
          }
        } catch (e) {
          xHeight = Math.round(unitsPerEm * 0.5);
        }
      }

      if (!capHeight || capHeight <= 0) {
        try {
          const hGlyph = loadedFont.charToGlyph("H");
          if (hGlyph.getBoundingBox) {
            const bounds = hGlyph.getBoundingBox();
            capHeight = bounds.y2;
          } else {
            capHeight = Math.round(unitsPerEm * 0.7);
          }
        } catch (e) {
          capHeight = Math.round(unitsPerEm * 0.7);
        }
      }

      if (descender >= 0 || descender < -unitsPerEm)
        descender = -Math.round(unitsPerEm * 0.2);
      if (xHeight <= 0 || xHeight > unitsPerEm)
        xHeight = Math.round(unitsPerEm * 0.5);
      if (capHeight <= xHeight || capHeight > unitsPerEm)
        capHeight = Math.round(unitsPerEm * 0.7);

      window.currentFontMetrics = {
        descender,
        xHeight,
        capHeight,
        unitsPerEm,
        source: "opentype.js",
      };
      updateGlyphPreview();
      window.currentOpenTypeFont = loadedFont;
    });
  } catch (error) {
    console.error("Error in opentype.js processing:", error);
    const metrics = createFallbackMetrics(fontFamily, fontData);
    window.currentFontMetrics = metrics;
    updateGlyphPreview();
  }
}

function updateGlyphPreview() {
  const glyphLetter = document.querySelector(".glyph-letter");
  const svg = glyphLetter.querySelector("svg");
  const textElem = svg.querySelector("text");
  if (!textElem || !window.currentFontMetrics) return;

  const { descender, xHeight, capHeight, unitsPerEm } =
    window.currentFontMetrics;

  // Set the SVG viewBox dimensions
  const svgWidth = 650;
  const svgHeight = 500;
  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

  // Position the baseline at the vertical center of the SVG
  const baseline = svgHeight / 2 + 50;
  window.currentBaseline = baseline;

  // Calculate available height for the font
  const availableHeight = svgHeight * 0.6; // 60% of SVG height

  // Calculate the font's total height in em units
  const fontTotalHeight = capHeight - descender; // From cap height to descender

  // Calculate scale factor to fit the font in the available height
  const scaleFactor = availableHeight / fontTotalHeight;

  // Calculate font size based on units per em and scale factor
  const fontSize = unitsPerEm * scaleFactor;

  // Calculate the positions of all metric lines based on the baseline
  // Note: In SVG, lower y values are higher up on the screen
  const capHeightY = baseline - capHeight * scaleFactor;
  const xHeightY = baseline - xHeight * scaleFactor;
  const descenderY = baseline - descender * scaleFactor; // Since descender is negative, this will be below baseline

  // Update the text element position and size
  textElem.setAttribute("x", svgWidth / 2); // Center horizontally
  textElem.setAttribute("y", baseline); // Position at baseline
  textElem.setAttribute("font-size", fontSize);
  textElem.setAttribute("dominant-baseline", "alphabetic"); // This ensures text sits on the baseline

  // Metric line color
  const lineColor = "#4F4F4F";

  // Update all metric lines
  updateMetricLine(svg, "baselineLine", 0, baseline, svgWidth, baseline, lineColor);
  updateMetricLine(svg, "capHeightLine", 0, capHeightY, svgWidth, capHeightY, lineColor);
  updateMetricLine(svg, "xHeightLine", 0, xHeightY, svgWidth, xHeightY, lineColor);
  updateMetricLine(svg, "descenderLine", 0, descenderY, svgWidth, descenderY, lineColor);

  // Clear existing labels
  svg
    .querySelectorAll(".metric-label, .metric-value")
    .forEach((el) => el.remove());

  // Add metric labels with values on the left and right sides
  addMetricLabels(svg, baseline, "Baseline", "0", lineColor);
  addMetricLabels(svg, capHeightY, "Cap Height", capHeight, lineColor);
  // Only add x-height labels if it's significantly different from cap-height
  if (Math.abs(xHeight - capHeight) > 0.01 * unitsPerEm) {
    addMetricLabels(svg, xHeightY, "x-Height", xHeight, lineColor);
  }
  addMetricLabels(svg, descenderY, "Descender", descender, lineColor);
}

// Helper function to update a metric line with a more accurate position
function updateMetricLine(svg, id, x1, y1, x2, y2, stroke) {
  let line = svg.getElementById(id);

  if (!line) {
    line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.id = id;
    svg.appendChild(line);
  }

  // Set precise coordinates with no rounding
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", stroke);
  line.setAttribute("stroke-width", 1);
}

// More precise metric label placement
function addMetricLabels(svg, y, name, value, color) {
  // Left side label (name)
  const nameLabel = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  nameLabel.setAttribute("x", 10);
  nameLabel.setAttribute("y", y - 5); // Position slightly above the line
  nameLabel.setAttribute("fill", color);
  nameLabel.setAttribute("font-size", "12px");
  nameLabel.setAttribute("font-family", "sans-serif");
  nameLabel.classList.add("metric-label");
  nameLabel.textContent = name;
  svg.appendChild(nameLabel);

  // Right side label (value)
  const valueLabel = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  valueLabel.setAttribute("x", 640);
  valueLabel.setAttribute("y", y - 5); // Position slightly above the line
  valueLabel.setAttribute("fill", color);
  valueLabel.setAttribute("font-size", "12px");
  valueLabel.setAttribute("font-family", "sans-serif");
  valueLabel.setAttribute("text-anchor", "end"); // Right align
  valueLabel.classList.add("metric-value");
  valueLabel.textContent = value;
  svg.appendChild(valueLabel);
}

// New function to set up static glyph rendering
function setupStaticGlyphRendering(fontFamily) {
  // Get the SVG text element
  const svgText = document.querySelector(".glyph-letter svg text");
  if (!svgText) return;

  // Apply the font family to the SVG element directly
  svgText.style.fontFamily = `'${fontFamily}', sans-serif`;

  // Ensure text is in the center
  svgText.setAttribute("text-anchor", "middle");

  // Remove any existing filters
  svgText.removeAttribute("filter");
}

// ========================================
// Alignment Button Functionality
// ========================================

/**
 * Initializes the alignment buttons with event listeners
 */
function initAlignmentButtons() {
  const alignButtons = document.querySelectorAll('.align-btn');
  
  alignButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Get the alignment from data attribute
      const alignment = button.getAttribute('data-align');
      
      // Remove active class from all buttons
      alignButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Apply the text alignment to all sample texts
      updateTextAlignment(alignment);
    });
  });
}

/**
 * Updates the text alignment for all sample text elements
 * @param {string} alignment - The text alignment value (left, center, right)
 */
function updateTextAlignment(alignment) {
  const sampleTexts = document.querySelectorAll('.sample-text');
  
  sampleTexts.forEach(element => {
    // Remove all existing alignment classes
    element.classList.remove('text-left', 'text-center', 'text-right');
    
    // Apply the new alignment class
    switch (alignment) {
      case 'left':
        element.style.textAlign = 'left';
        break;
      case 'center':
        element.style.textAlign = 'center';
        break;
      case 'right':
        element.style.textAlign = 'right';
        break;
    }
  });
}

// ========================================
// DOMContentLoaded Initialization
// ========================================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize loader first
    await initFontLoader();

    // Then initialize font profile
    await initFontProfile();

    // Initialize the control section first so letter name container exists
    initControlSection();

    // Then initialize grid (which may update the letter again)
    initGlyphGrid();

    await initFontMetrics();
    updateGlyphPreview();
    
    // Initialize alignment buttons
    initAlignmentButtons();

    // Force re-update of the letter name to ensure Unicode is displayed
    const currentChar =
      document.querySelector(".glyph-letter svg text")?.textContent || "A";
    updateLetterName(currentChar);
  } catch (error) {
    console.error("Error initializing application:", error);
  }
});

/**
 * Displays comprehensive font details in a simplified list format
 * @param {Object} fontData - Font data object from the loader
 */
function displayFontDetails(fontData) {
  if (!fontData) return;
  
  // Basic font information
  setElementContent("font-family", fontData.name || "Unknown");
  setElementContent("font-designer", fontData.designer || "Unknown");
  
  // Format the date to be more readable
  if (fontData.date_added) {
    const date = new Date(fontData.date_added);
    const formattedDate = date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    setElementContent("font-date", formattedDate);
  } else {
    setElementContent("font-date", "Unknown");
  }
  
  // Set the license info
  const licenseValue = document.getElementById("font-license");
  if (licenseValue) {
    const licenseText = fontData.license || "Unknown";
    licenseValue.textContent = licenseText;
    
    // Add a visual indicator that there's a tooltip
    licenseValue.innerHTML = `${licenseText} <span class="tooltip-indicator">ⓘ</span>`;
  }
  
  // Update the license tooltip details based on license type
  const licenseDetails = document.getElementById("license-details");
  if (licenseDetails) {
    switch(fontData.license) {
      case "OFL":
        licenseDetails.textContent = "This font is licensed under the SIL Open Font License 1.1. This license allows the font to be used, studied, modified and redistributed freely as long as they are not sold by themselves.";
        break;
      case "APACHE":
        licenseDetails.textContent = "This font is licensed under the Apache License 2.0, which allows you to use, modify, and distribute the font, even for commercial purposes.";
        break;
      case "UFL":
        licenseDetails.textContent = "This font is licensed under the Ubuntu Font License, which allows the font to be used, studied, modified and redistributed freely with some restrictions.";
        break;
      default:
        licenseDetails.textContent = `This font is available under the ${fontData.license || "specified"} license. Please check the specific terms before use.`;
    }
  }
  
  // Update the category badge with appropriate styling
  const categoryElem = document.getElementById("font-category");
  if (categoryElem && fontData.category) {
    const category = formatCategory(fontData.category);
    categoryElem.textContent = category;
  }
  
  // Count styles
  if (variantObjects && variantObjects.length > 0) {
    setElementContent("font-styles", variantObjects.length.toString());
  } else if (fontData.variants && fontData.variants.length > 0) {
    setElementContent("font-styles", fontData.variants.length.toString());
  } else {
    setElementContent("font-styles", "Unknown");
  }
  
  // Check if it's a variable font
  const isVariable = fontLoader.isVariableFont(fontData);
  setElementContent("font-variable", isVariable ? "Yes" : "No");
  
  // Add variable font axes if available
  if (isVariable && fontData.axes) {
    const axesContainer = document.getElementById("font-axes");
    if (axesContainer) {
      axesContainer.innerHTML = '';
      
      Object.entries(fontData.axes).forEach(([axis, range]) => {
        const axisTag = document.createElement("span");
        axisTag.className = "axis-tag";
        axisTag.textContent = `${axis}: ${range.min} - ${range.max}`;
        axesContainer.appendChild(axisTag);
      });
    }
  } else {
    // Hide axes row if not a variable font
    const axesContainer = document.getElementById("axes-container");
    if (axesContainer) {
      axesContainer.style.display = "none";
    }
  }
}

/**
 * Helper to set element content safely
 * @param {string} id - Element ID
 * @param {string} content - Content to set
 */
function setElementContent(id, content) {
  const element = document.getElementById(id);
  if (element) element.textContent = content;
}

/**
 * Format category string more nicely
 * @param {string} category - Category string (like "SANS_SERIF")
 * @returns {string} Formatted category
 */
function formatCategory(category) {
  if (!category) return "Unknown";
  
  // Convert from UPPERCASE_WITH_UNDERSCORE to Title Case
  return category
    .toLowerCase()
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
