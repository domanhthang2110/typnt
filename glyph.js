// ========================================
// Font Data Fetching and Loading
// ========================================

async function fetchFontsData() {
  const response = await fetch("fonts.json");
  return await response.json();
}

function loadFonts(fontData) {
  const families = fontData.map((data) => {
    const weights = data.variants
      .map((variant) => {
        if (variant === "regular") return "400";
        if (variant === "italic") return "400italic";
        return variant.includes("italic")
          ? `${variant.replace("italic", "")}italic`
          : variant;
      })
      .join(",");
    return `${data.family}:${weights}`;
  });

  WebFont.load({
    google: {
      families: families,
    },
    fontactive: function (familyName, fvd) {
      console.log(`Font ${familyName} with variant ${fvd} has loaded.`);
    },
    fontinactive: function (familyName, fvd) {
      console.log(`Font ${familyName} with variant ${fvd} failed to load.`);
    },
  });
}

async function getFontData(fontFamily) {
  const fontsData = await fetchFontsData();
  return fontsData.items.find((item) => item.family === fontFamily);
}


// ========================================
// Variant Card Creation and Display
// ========================================

function createVariantCard(variant, fontFamily) {
  const card = document.createElement("div");
  card.classList.add(
    "card",
    "bg",
    "p-6",
    "border",
    "border-[#4F4F4F]",
    "hover:border-[#FFF9F9]",
    "transition-colors",
    "duration-300",
    "ease-in-out",
    "shadow-lg",
    "mb-6",
    "relative"
  );

  const variantName = document.createElement("h3");
  variantName.innerText = translateWeightToName(variant);
  variantName.classList.add("text-sm", "text-white");

  const sampleText = document.createElement("p");
  sampleText.innerText = "Sample Text";
  sampleText.style.fontFamily = `${fontFamily}`;
  sampleText.style.fontWeight = variant.replace("italic", "") || "400";
  sampleText.style.fontStyle = variant.includes("italic") ? "italic" : "normal";
  sampleText.classList.add("sample-text", "text-8xl", "mt-4", "mb-4", "outline-none");
  sampleText.contentEditable = true;

  card.appendChild(variantName);
  card.appendChild(sampleText);

  return card;
}

function displayVariantCards(fontData) {
  const fragment = document.createDocumentFragment();
  fontData.variants.forEach((variant) => {
    const card = createVariantCard(variant, fontData.family);
    fragment.appendChild(card);
  });
  document.querySelector(".styles-list").appendChild(fragment);
}


// ========================================
// Outline Toggle Functionality
// ========================================

let outlineEnabled = false;

function toggleOutline() {
  if (outlineEnabled) {
    const styleElement = document.querySelector("style#outline-style");
    if (styleElement) {
      styleElement.remove();
    }
  } else {
    const style = document.createElement("style");
    style.id = "outline-style";
    style.innerHTML = "* { outline: 1px solid red; }";
    document.head.appendChild(style);
  }
  outlineEnabled = !outlineEnabled;
}

document.addEventListener("keydown", (event) => {
  if (event.key === "o" || event.key === "O") {
    toggleOutline();
  }
});


// ========================================
// Weight Translation Functionality
// ========================================

const weightNames = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

function translateWeightToName(weight) {
  if (weight === "regular") return "Regular";
  if (weight === "italic") return "Italic";

  if (weightNames[weight]) return weightNames[weight];

  const weightWithoutItalic = weight.replace("italic", "");
  if (weightWithoutItalic && weightNames[weightWithoutItalic]) {
    return weightNames[weightWithoutItalic] + " Italic";
  }

  return weight;
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

document.getElementById("citiesDemoBtn").addEventListener("click", function() {
  const sampleTexts = document.querySelectorAll(".sample-text");
  const cityName = getRandomCity();
  sampleTexts.forEach(function(element) {
    element.textContent = cityName;
  });
});

document.getElementById("defaultDemoBtn").addEventListener("click", function() {
  const sampleTexts = document.querySelectorAll(".sample-text");
  const fontFamily = document.querySelector(".font-name").textContent;
  sampleTexts.forEach(function(element) {
    element.textContent = fontFamily;
  });
});

const cities = [
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", 
  "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
  "London", "Paris", "Tokyo", "Beijing", "Moscow", 
  "Sydney", "Dubai", "Rome", "Berlin", "Madrid",
  "Toronto", "Vancouver", "Mexico City", "Buenos Aires", "São Paulo",
  "Cairo", "Istanbul", "Mumbai", "Bangkok", "Seoul",
  "Hong Kong", "Singapore", "Kuala Lumpur", "Jakarta", "Lagos"
];

function getRandomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}


// ========================================
// Initialization Functions
// ========================================

async function initFontProfile() {
  // Extract the font parameter from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const fontFamily = urlParams.get("font");

  if (fontFamily) {
    // Get the font data
    const fontData = await getFontData(fontFamily);

    if (fontData) {
      // Update the font-name and font-title elements
      const fontNameElement = document.querySelector(".font-name");
      const fontTitleElement = document.querySelector(".font-title-name");

      fontNameElement.textContent = fontFamily;
      fontTitleElement.textContent = fontFamily;

      // Load fonts and apply the font family
      loadFonts([fontData]);
      fontNameElement.style.fontFamily = fontFamily;
      fontTitleElement.style.fontFamily = fontFamily;

      // Display variant cards
      displayVariantCards(fontData);

      // Set initial sample text to the font family name
      const sampleTextElements = document.querySelectorAll(".sample-text");
      sampleTextElements.forEach((element) => {
        element.textContent = fontFamily;
      });

      // Display font details in .font-info
      const fontInfoElement = document.querySelector(".font-info");
      fontInfoElement.innerHTML = `
        <p><strong>Family:</strong> ${fontData.family}</p>
        <p><strong>Category:</strong> ${fontData.category || 'N/A'}</p>
        <p><strong>Variants:</strong> ${fontData.variants.join(', ')}</p>
        <p><strong>Version:</strong> ${fontData.version || 'N/A'}</p>
      `;

      console.log("Font Data:", fontData);
    } else {
      console.error(`Font family "${fontFamily}" not found in fonts.json`);
    }
  }
}

// Modified function to create glyph grid with fixed selection highlighting
function initGlyphGrid() {
  const glyphGrid = document.querySelector(".glyph-grid");
  glyphGrid.innerHTML = "";
  glyphGrid.style.display = "block";

  // Get the current font family from the page
  const pageFont = document.querySelector(".font-name").textContent || "";

  // Cache the glyph-letter element and set its font family
  const glyphLetter = document.querySelector(".glyph-letter");
  glyphLetter.style.fontFamily = pageFont;

  // Set up a single event listener using event delegation for all cells
  glyphGrid.addEventListener("click", (event) => {
    const cell = event.target.closest(".grid-cell");
    if (!cell) return; // Exit if we didn't click on a cell
    
    // Update selection highlighting - do this first for immediate visual feedback
    const previouslySelected = glyphGrid.querySelector(".grid-cell.selected");
    if (previouslySelected) {
      previouslySelected.classList.remove("selected");
    }
    cell.classList.add("selected");
    
    // Update SVG with the letter
    const letter = cell.textContent;
    const svgText = glyphLetter.querySelector("text");
    if (svgText) {
      svgText.textContent = letter;
      updateLetterName(letter);
    }
  });

  // Create section for uppercase letters
  const uppercaseSection = createSection("uppercase", "Uppercase");
  const uppercaseGrid = createGrid(10);
  
  // Populate uppercase grid
  for (let i = 65; i <= 90; i++) {
    const cell = createCell(String.fromCharCode(i), pageFont);
    // Mark the first cell (A) as selected
    if (i === 65) cell.classList.add("selected");
    uppercaseGrid.appendChild(cell);
  }
  uppercaseSection.appendChild(uppercaseGrid);
  
  // Create and populate other sections...
  // ...existing code for other sections...
  
  // Create section for lowercase letters
  const lowercaseSection = createSection("lowercase", "Lowercase");
  const lowercaseGrid = createGrid(10);
  
  // Populate lowercase grid
  for (let i = 97; i <= 122; i++) {
    lowercaseGrid.appendChild(createCell(String.fromCharCode(i), pageFont));
  }
  lowercaseSection.appendChild(lowercaseGrid);
  
  // Create section for numerals
  const numeralsSection = createSection("numerals", "Numerals");
  const numeralsGrid = createGrid(10);
  
  // Populate numerals grid
  for (let i = 0; i <= 9; i++) {
    numeralsGrid.appendChild(createCell(i.toString(), pageFont));
  }
  numeralsSection.appendChild(numeralsGrid);
  
  // Create section for punctuation
  const punctuationSection = createSection("punctuation", "Punctuation");
  const punctuationGrid = createGrid(10);
  
  // Populate punctuation grid (using simpler code for clarity)
  const punctChars = [];
  for (let i = 0x21; i <= 0x2F; i++) punctChars.push(String.fromCharCode(i));
  for (let i = 0x3A; i <= 0x40; i++) punctChars.push(String.fromCharCode(i));
  for (let i = 0x5B; i <= 0x60; i++) punctChars.push(String.fromCharCode(i));
  for (let i = 0x7B; i <= 0x7E; i++) punctChars.push(String.fromCharCode(i));
  
  punctChars.forEach(char => {
    punctuationGrid.appendChild(createCell(char, pageFont));
  });
  punctuationSection.appendChild(punctuationGrid);
  
  // Create section for extended Latin
  const extendedLatinSection = createSection("extended-latin", "Extended Latin");
  const extendedLatinGrid = createGrid(10);
  
  // Populate extended Latin grid
  for (let i = 0x0100; i <= 0x017F; i++) {
    extendedLatinGrid.appendChild(createCell(String.fromCharCode(i), pageFont));
  }
  extendedLatinSection.appendChild(extendedLatinGrid);
  
  // Append all sections to the grid
  glyphGrid.appendChild(uppercaseSection);
  glyphGrid.appendChild(lowercaseSection);
  glyphGrid.appendChild(numeralsSection);
  glyphGrid.appendChild(punctuationSection);
  glyphGrid.appendChild(extendedLatinSection);
  
  // Set initial preview for "A" (already marked as selected in the grid)
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
  
  // Apply CSS class
  glyphControl.className = "glyph-control";
  
  // Create a single row container with flexbox
  const controlRow = document.createElement("div");
  controlRow.className = "control-row";
  controlRow.style.display = "flex";
  controlRow.style.width = "100%";
  controlRow.style.justifyContent = "space-between";
  controlRow.style.alignItems = "center";
  
  // ---- 1. Letter Name Display ----
  const letterNameContainer = document.createElement("div");
  letterNameContainer.className = "letter-name";
  letterNameContainer.id = "letterName";
  letterNameContainer.style.flex = "1"; // Take available space
  
  // Initialize with default letter name - using our function instead of hardcoding
  // We'll call updateLetterName('A') after adding it to the DOM
  
  // ---- 2. Solid/Outline Toggle ----
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
  
  // ---- 3. Style Selection Dropdown ----
  const styleSelectContainer = document.createElement("div");
  styleSelectContainer.className = "style-select";
  
  const styleLabel = document.createElement("span");
  styleLabel.textContent = "Style:";
  styleLabel.className = "style-label";
  
  const styleSelect = document.createElement("select");
  styleSelect.id = "fontStyle";
  styleSelect.className = "font-style-dropdown";
  
  const defaultOption = document.createElement("option");
  defaultOption.value = "regular";
  defaultOption.textContent = "Regular";
  defaultOption.selected = true;
  styleSelect.appendChild(defaultOption);
  
  styleSelectContainer.appendChild(styleLabel);
  styleSelectContainer.appendChild(styleSelect);
  
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
  
  // Add all elements to control row in order
  controlRow.appendChild(letterNameContainer);
  controlRow.appendChild(renderModeContainer);
  controlRow.appendChild(styleSelectContainer);
  controlRow.appendChild(glyphSetContainer);
  
  // Add control row to the main container
  glyphControl.appendChild(controlRow);
  
  // Set initial letter name with Unicode properly
  updateLetterName('A');
  
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
    }
  });
  
  outlineBtn.addEventListener("click", () => {
    outlineBtn.classList.add("active");
    solidBtn.classList.remove("active");
    
    const svgText = document.querySelector(".glyph-letter svg text");
    if (svgText) {
      // Apply consistent outline style
      svgText.setAttribute("fill", "none");
      svgText.setAttribute("stroke", "white");
      svgText.setAttribute("stroke-width", "1");
      svgText.setAttribute("stroke-mode", "inside");
      
      // Ensure crisp outline with vector tricks
      //svgText.setAttribute("paint-order", "stroke");
      //svgText.setAttribute("stroke-linejoin", "round");
      //svgText.setAttribute("stroke-linecap", "round");
    }
  });
  
  // Glyph set toggle (basic/full)
  basicBtn.addEventListener("click", () => {
    basicBtn.classList.add("active");
    fullBtn.classList.remove("active");
    
    // Show only basic sections
    toggleGlyphSections("basic");
  });
  
  fullBtn.addEventListener("click", () => {
    fullBtn.classList.add("active");
    basicBtn.classList.remove("active");
    
    // Show all sections
    toggleGlyphSections("full");
  });
  
  // Populate font style options and set up the change event
  populateFontStyleOptions(styleSelect).then(() => {
    styleSelect.addEventListener("change", updateFontStyle);
  });
}

/**
 * Updates the letter name display in the controls based on the selected character
 */
function updateLetterName(char) {
  const letterName = document.getElementById("letterName");
  if (!letterName) return;
  
  // Get the character code
  const code = char.charCodeAt(0);
  const unicodeHex = code.toString(16).toUpperCase().padStart(4, '0');
  
  // Determine letter type
  let name = "";
  
  if (code >= 65 && code <= 90) { // A-Z
    name = `Capital Letter ${char}`;
  } else if (code >= 97 && code <= 122) { // a-z
    name = `Small Letter ${char.toUpperCase()}`;
  } else if (code >= 48 && code <= 57) { // 0-9
    name = `Number ${char}`;
  } else if (code >= 0x0100 && code <= 0x017F) { // Extended Latin
    name = `Extended Latin ${char}`;
  } else if ((code >= 0x0021 && code <= 0x002F) || // Punctuation and symbols
           (code >= 0x003A && code <= 0x0040) ||
           (code >= 0x005B && code <= 0x0060) ||
           (code >= 0x007B && code <= 0x007E)) {
    name = `Symbol ${char}`;
  } else {
    name = `Character ${char}`;
  }
  
  // Clear existing content
  letterName.innerHTML = '';
  
  // Create main text node
  const nameText = document.createTextNode(name);
  letterName.appendChild(nameText);
  
  // Create Unicode display
  const unicodeSpan = document.createElement('span');
  unicodeSpan.className = 'unicode-value';
  unicodeSpan.textContent = ` U+${unicodeHex}`;
  letterName.appendChild(unicodeSpan);
  console.log(letterName.innerHTML);
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
  sections.forEach(section => {
    const sectionType = section.getAttribute("data-section");
    
    if (mode === "basic") {
      // Only show uppercase, lowercase, and numerals in basic mode
      section.style.display = (sectionType === "uppercase" || 
                               sectionType === "lowercase" || 
                               sectionType === "numerals") ? "block" : "none";
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
  const fontFamily = document.querySelector(".font-name").textContent;
  const fontData = await getFontData(fontFamily);
  
  if (!fontData || !fontData.variants) return;
  
  // Clear existing options
  styleSelect.innerHTML = "";
  
  // Group variants by weight and style
  const regularVariants = [];
  const italicVariants = [];
  
  fontData.variants.forEach(variant => {
    if (variant.includes("italic")) {
      italicVariants.push(variant);
    } else {
      regularVariants.push(variant);
    }
  });
  
  // First add all regular styles
  regularVariants.forEach(variant => {
    const option = document.createElement("option");
    option.value = variant;
    
    // Parse the weight
    let weight = variant === "regular" ? "400" : variant;
    
    option.dataset.weight = weight;
    option.dataset.style = "normal";
    option.textContent = translateWeightToName(variant);
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
  italicVariants.forEach(variant => {
    const option = document.createElement("option");
    option.value = variant;
    
    // Parse the weight
    let weight = variant === "italic" ? "400" : variant.replace("italic", "");
    
    option.dataset.weight = weight;
    option.dataset.style = "italic";
    option.textContent = translateWeightToName(variant);
    styleSelect.appendChild(option);
  });
  
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
  // Get the current font family from the .font-name element.
  const fontFamily = document.querySelector(".font-name").textContent;
  if (!fontFamily) {
    console.error("No font family found in .font-name element.");
    return;
  }

  // Get the corresponding font data from fonts.json.
  const fontData = await getFontData(fontFamily);
  if (!fontData) {
    console.error(`Font family "${fontFamily}" not found in fonts.json`);
    return;
  }

  // Determine the URL for the font file:
  let fileUrl = "";
  if (fontData.files && fontData.files.regular) {
    fileUrl = fontData.files.regular;
  } else if (fontData.files) {
    const keys = Object.keys(fontData.files);
    if (keys.length > 0) {
      fileUrl = fontData.files[keys[0]];
    }
  }

  if (!fileUrl) {
    console.error(`No font file URL found for "${fontFamily}".`);
    return;
  }

  // Use opentype.js to load the font file and extract metrics.
  opentype.load(fileUrl, function(err, loadedFont) {
    if (err) {
      console.error(`Error loading font "${fontFamily}" from ${fileUrl}:`, err);
      // Use fallback values when font cannot be loaded
      window.currentFontMetrics = {
        descender: -200,
        xHeight: 500,
        capHeight: 700,
        unitsPerEm: 1000
      };
      console.warn("Using fallback metrics due to font loading error");
      updateGlyphPreview();
      return;
    }

    // Get the font's units per em - critical for proper scaling
    const unitsPerEm = loadedFont.unitsPerEm || 1000;

    // Retrieve basic metrics (these should be available in all fonts)
    let descender = loadedFont.descender;
    let xHeight = null;
    let capHeight = null;

    // Try to get metrics from OS/2 table (most reliable source)
    if (loadedFont.tables.os2) {
      const os2 = loadedFont.tables.os2;
      // Use OS/2 metrics if available
      if (os2.sxHeight) {
        xHeight = os2.sxHeight;
      }
      if (os2.sCapHeight) {
        capHeight = os2.sCapHeight;
      }
      
      // Many fonts use usWinDescent for actual rendering boundaries
      const winDescent = os2.usWinDescent;
      
      if (winDescent && winDescent > 0) {
        descender = -winDescent; // Convert to negative as per font convention
      } else if (os2.typoDescender) {
        // Fall back to typographic metrics
        descender = os2.typoDescender;
      }
    }

    // If xHeight is missing, estimate from 'x' character
    if (!xHeight || xHeight <= 0) {
      try {
        const xGlyph = loadedFont.charToGlyph('x');
          xHeight = Math.round(unitsPerEm * 0.5); // Fallback: estimate as 50% of UPM
      } catch (e) {
        console.warn("Couldn't determine x-height from glyph:", e);
        xHeight = Math.round(unitsPerEm * 0.5);
      }
    }

    // If capHeight is missing, estimate from 'H' character
    if (!capHeight || capHeight <= 0) {
      try {
        const hGlyph = loadedFont.charToGlyph('H');
          capHeight = Math.round(unitsPerEm * 0.7); // Fallback: estimate as 70% of UPM
      } catch (e) {
        console.warn("Couldn't determine cap height from glyph:", e);
        capHeight = Math.round(unitsPerEm * 0.7);
      }
    }

    // Sanitize values: ensure all metrics are reasonable
    if (descender >= 0 || descender < -unitsPerEm) descender = -Math.round(unitsPerEm * 0.2);
    if (xHeight <= 0 || xHeight > unitsPerEm) xHeight = Math.round(unitsPerEm * 0.5);
    if (capHeight <= xHeight || capHeight > unitsPerEm) capHeight = Math.round(unitsPerEm * 0.7);

    // Save metrics globally.
    window.currentFontMetrics = {
      descender,
      xHeight,
      capHeight,
      unitsPerEm
    };

    console.log(`Loaded metrics for ${fontFamily}:`, window.currentFontMetrics);

    // Update the glyph-letter preview with the new metrics.
    updateGlyphPreview();
  });
}

function updateGlyphPreview() {
  const glyphLetter = document.querySelector(".glyph-letter");
  const svg = glyphLetter.querySelector("svg");
  const textElem = svg.querySelector("text");
  if (!textElem || !window.currentFontMetrics) return;

  const { descender, xHeight, capHeight, unitsPerEm } = window.currentFontMetrics;

  // Set the SVG viewBox dimensions
  const svgWidth = 500;
  const svgHeight = 500;
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  
  // Position the baseline at the vertical center of the SVG
  const baseline = svgHeight / 2;
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
  const capHeightY = baseline - (capHeight * scaleFactor);
  const xHeightY = baseline - (xHeight * scaleFactor);
  const descenderY = baseline - (descender * scaleFactor); // Since descender is negative, this will be below baseline
  
  // Update the text element position and size
  textElem.setAttribute('x', svgWidth / 2); // Center horizontally
  textElem.setAttribute('y', baseline); // Position at baseline
  textElem.setAttribute('font-size', fontSize);
  textElem.setAttribute('dominant-baseline', 'alphabetic'); // This ensures text sits on the baseline
  
  // Metric line color
  const lineColor = '#4F4F4F';
  
  // Update all metric lines
  updateMetricLine(svg, 'baselineLine', 0, baseline, svgWidth, baseline, lineColor);
  updateMetricLine(svg, 'capHeightLine', 0, capHeightY, svgWidth, capHeightY, lineColor);
  updateMetricLine(svg, 'xHeightLine', 0, xHeightY, svgWidth, xHeightY, lineColor);
  updateMetricLine(svg, 'descenderLine', 0, descenderY, svgWidth, descenderY, lineColor);
  
  // Clear existing labels
  svg.querySelectorAll('.metric-label, .metric-value').forEach(el => el.remove());
  
  // Add metric labels with values on the left and right sides
  addMetricLabels(svg, baseline, 'Baseline', '0', lineColor);
  addMetricLabels(svg, capHeightY, 'Cap Height', capHeight, lineColor);
  addMetricLabels(svg, xHeightY, 'x-Height', xHeight, lineColor);
  addMetricLabels(svg, descenderY, 'Descender', descender, lineColor);
  // Log the metrics for debugging
  console.log("Font metrics positions:", {
    baseline,
    capHeightY,
    xHeightY,
    descenderY,
    fontSize,
    scaleFactor
  });
}

// Helper function to update a metric line with a more accurate position
function updateMetricLine(svg, id, x1, y1, x2, y2, stroke) {
  let line = svg.getElementById(id);
  
  if (!line) {
    line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.id = id;
    svg.appendChild(line);
  }
  
  // Set precise coordinates with no rounding
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('stroke', stroke);
  line.setAttribute('stroke-width', 1);
}

// More precise metric label placement
function addMetricLabels(svg, y, name, value, color) {
  // Left side label (name)
  const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  nameLabel.setAttribute('x', 10);
  nameLabel.setAttribute('y', y - 5); // Position slightly above the line
  nameLabel.setAttribute('fill', color);
  nameLabel.setAttribute('font-size', '12px');
  nameLabel.setAttribute('font-family', 'sans-serif');
  nameLabel.classList.add('metric-label');
  nameLabel.textContent = name;
  svg.appendChild(nameLabel);
  
  // Right side label (value)
  const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  valueLabel.setAttribute('x', 490);
  valueLabel.setAttribute('y', y - 5); // Position slightly above the line
  valueLabel.setAttribute('fill', color);
  valueLabel.setAttribute('font-size', '12px');
  valueLabel.setAttribute('font-family', 'sans-serif');
  valueLabel.setAttribute('text-anchor', 'end'); // Right align
  valueLabel.classList.add('metric-value');
  valueLabel.textContent = value;
  svg.appendChild(valueLabel);
}

// ========================================
// DOMContentLoaded Initialization
// ========================================

document.addEventListener("DOMContentLoaded", async () => {
  await initFontProfile();
  
  // Initialize the control section first so letter name container exists
  initControlSection();
  
  // Then initialize grid (which may update the letter again)
  initGlyphGrid();
  
  await initFontMetrics();
  updateGlyphPreview();
  
  // Force re-update of the letter name to ensure Unicode is displayed
  const currentChar = document.querySelector(".glyph-letter svg text")?.textContent || 'A';
  updateLetterName(currentChar);
});
