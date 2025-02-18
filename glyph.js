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

function initGlyphGrid() {
  const glyphGrid = document.querySelector(".glyph-grid");
  glyphGrid.innerHTML = "";
  glyphGrid.style.display = "block";

  // Get the current font family from the page.
  const pageFont = document.querySelector(".font-name").textContent || "";

  // Cache the glyph-letter element and set its font family.
  const glyphLetter = document.querySelector(".glyph-letter");
  glyphLetter.style.fontFamily = pageFont;

  // Helper: update SVG letter content.
  function updateSvgLetter(letter) {
    const svgText = glyphLetter.querySelector("text");
    if (svgText) {
      svgText.textContent = letter;
    }
  }

  // --- Uppercase Section ---
  const uppercaseSection = document.createElement("div");
  uppercaseSection.innerHTML =
    "<h3 class='text-center font-bold mb-2'>Uppercase</h3>";
  const uppercaseGrid = document.createElement("div");
  uppercaseGrid.style.display = "grid";
  uppercaseGrid.style.gridTemplateColumns = "repeat(8, 1fr)";
  uppercaseGrid.style.gap = "0";

  // --- Lowercase Section ---
  const lowercaseSection = document.createElement("div");
  lowercaseSection.innerHTML =
    "<h3 class='text-center font-bold mt-4 mb-2'>Lowercase</h3>";
  const lowercaseGrid = document.createElement("div");
  lowercaseGrid.style.display = "grid";
  lowercaseGrid.style.gridTemplateColumns = "repeat(8, 1fr)";
  lowercaseGrid.style.gap = "0";

  for (let i = 65; i <= 90; i++) {
    const upper = String.fromCharCode(i);
    const lower = String.fromCharCode(i + 32);

    // Uppercase cell using the universal CSS class.
    const uppercaseCell = document.createElement("div");
    uppercaseCell.classList.add("grid-cell");
    uppercaseCell.innerText = upper;
    uppercaseCell.style.fontFamily = pageFont;
    uppercaseCell.addEventListener("click", () => {
      updateSvgLetter(upper);
    });
    uppercaseGrid.appendChild(uppercaseCell);

    // Lowercase cell using the universal CSS class.
    const lowercaseCell = document.createElement("div");
    lowercaseCell.classList.add("grid-cell");
    lowercaseCell.innerText = lower;
    lowercaseCell.style.fontFamily = pageFont;
    lowercaseCell.addEventListener("click", () => {
      updateSvgLetter(lower);
    });
    lowercaseGrid.appendChild(lowercaseCell);
  }

  uppercaseSection.appendChild(uppercaseGrid);
  lowercaseSection.appendChild(lowercaseGrid);

  // --- Numerals Section ---
  const numeralsSection = document.createElement("div");
  numeralsSection.innerHTML =
    "<h3 class='text-center font-bold mt-4 mb-2'>Numerals</h3>";
  const numeralsGrid = document.createElement("div");
  numeralsGrid.style.display = "grid";
  numeralsGrid.style.gridTemplateColumns = "repeat(8, 1fr)";
  numeralsGrid.style.gap = "0";

  const numerals = Array.from({ length: 10 }, (_, i) => i.toString());
  numerals.forEach((num) => {
    const cell = document.createElement("div");
    cell.classList.add("grid-cell");
    cell.innerText = num;
    cell.style.fontFamily = pageFont;
    cell.addEventListener("click", () => {
      updateSvgLetter(num);
    });
    numeralsGrid.appendChild(cell);
  });
  numeralsSection.appendChild(numeralsGrid);

  // --- Punctuation Section --- (Unicode U+0021 to U+002F)
  const punctuationSection = document.createElement("div");
  punctuationSection.innerHTML =
    "<h3 class='text-center font-bold mt-4 mb-2'>Punctuation</h3>";
  const punctuationGrid = document.createElement("div");
  punctuationGrid.style.display = "grid";
  punctuationGrid.style.gridTemplateColumns = "repeat(8, 1fr)";
  punctuationGrid.style.gap = "0";

  const punctuationMarks = Array.from({ length: 0x2f - 0x21 + 1 }, (_, i) =>
    String.fromCharCode(0x21 + i)
  );
  punctuationMarks.forEach((punct) => {
    const cell = document.createElement("div");
    cell.classList.add("grid-cell");
    cell.innerText = punct;
    cell.style.fontFamily = pageFont;
    cell.addEventListener("click", () => {
      updateSvgLetter(punct);
    });
    punctuationGrid.appendChild(cell);
  });
  punctuationSection.appendChild(punctuationGrid);

  // --- Extended Latin Section (Unicode U+0100 to U+017F) ---
  const extendedLatinSection = document.createElement("div");
  extendedLatinSection.innerHTML =
    "<h3 class='text-center font-bold mt-4 mb-2'>Extended Latin</h3>";
  const extendedLatinGrid = document.createElement("div");
  extendedLatinGrid.style.display = "grid";
  extendedLatinGrid.style.gridTemplateColumns = "repeat(8, 1fr)";
  extendedLatinGrid.style.gap = "0";

  for (let code = 0x0100; code <= 0x017f; code++) {
    const char = String.fromCharCode(code);
    const cell = document.createElement("div");
    cell.classList.add("grid-cell");
    cell.innerText = char;
    cell.style.fontFamily = pageFont;
    cell.addEventListener("click", () => {
      updateSvgLetter(char);
    });
    extendedLatinGrid.appendChild(cell);
  }
  extendedLatinSection.appendChild(extendedLatinGrid);

  // Append all sections to the glyph grid container.
  glyphGrid.appendChild(uppercaseSection);
  glyphGrid.appendChild(lowercaseSection);
  glyphGrid.appendChild(numeralsSection);
  glyphGrid.appendChild(punctuationSection);
  glyphGrid.appendChild(extendedLatinSection);

  // Set an initial preview.
  updateSvgLetter("A");
}

// Place this function in glyph.js and call it after initializing the glyph grid.
function initControlSection() {
  const glyphControl = document.querySelector(".glyph-control");
  glyphControl.innerHTML = "";

  // Create container for Unicode info.
  const unicodeContainer = document.createElement("div");
  unicodeContainer.classList.add("unicode-info");

  // Create element for unicode title.
  const unicodeTitle = document.createElement("span");
  unicodeTitle.classList.add("unicode-title");
  unicodeTitle.textContent = "Unicode Title:";

  // Create element for unicode code.
  const unicodeCode = document.createElement("span");
  unicodeCode.classList.add("unicode-code");

  // Get the current character from the SVG's <text> element.
  const glyphLetter = document.querySelector(".glyph-letter");
  const svgText = glyphLetter.querySelector("text");
  const currentChar = svgText ? svgText.textContent : "A";
  const codePoint = currentChar.charCodeAt(0).toString(16).toUpperCase();
  unicodeCode.textContent = ` U+${codePoint}`;

  // Append Unicode info elements.
  unicodeContainer.appendChild(unicodeTitle);
  unicodeContainer.appendChild(unicodeCode);

  // Create container for mode switching buttons.
  const modeSwitchContainer = document.createElement("div");
  modeSwitchContainer.classList.add("mode-switch");

  // Create the Solid mode button.
  const solidBtn = document.createElement("button");
  solidBtn.id = "solidBtn";
  solidBtn.classList.add("btn-solid");
  solidBtn.textContent = "Solid";

  // Create the Outline mode button.
  const outlineBtn = document.createElement("button");
  outlineBtn.id = "outlineBtn";
  outlineBtn.classList.add("btn-outline");
  outlineBtn.textContent = "Outline";

  // Append buttons to the mode switch container.
  modeSwitchContainer.appendChild(solidBtn);
  modeSwitchContainer.appendChild(outlineBtn);

  // --- Add Baseline Slider ---
  const sliderContainer = document.createElement("div");
  sliderContainer.classList.add("baseline-slider-container");
  sliderContainer.style.marginTop = "10px";
  sliderContainer.innerHTML = `
    <label for="baselineSlider">Baseline Offset: </label>
    <input type="range" id="baselineSlider" min="0" max="500" value="250" style="vertical-align: middle;"/>
    <span id="baselineValue">250</span>
  `;

  // Listen for slider changes.
  const baselineSlider = sliderContainer.querySelector("#baselineSlider");
  const baselineValueSpan = sliderContainer.querySelector("#baselineValue");
  baselineSlider.addEventListener("input", (e) => {
    window.currentBaseline = e.target.value;
    baselineValueSpan.textContent = e.target.value;
    updateGlyphPreview();
  });

  // --- Add Font Size Slider ---
  const fontSizeSliderContainer = document.createElement("div");
  fontSizeSliderContainer.classList.add("font-size-slider-container");
  fontSizeSliderContainer.style.marginTop = "10px";
  fontSizeSliderContainer.innerHTML = `
    <label for="fontSizeSlider">Font Size: </label>
    <input type="range" id="fontSizeSlider" min="10" max="2000" value="1000" style="vertical-align: middle;"/>
    <span id="fontSizeValue">1000</span>
  `;

  // Listen for font size slider changes.
  const fontSizeSlider = fontSizeSliderContainer.querySelector("#fontSizeSlider");
  const fontSizeValueSpan = fontSizeSliderContainer.querySelector("#fontSizeValue");
  fontSizeSlider.addEventListener("input", (e) => {
    const newFontSize = e.target.value;
    fontSizeValueSpan.textContent = newFontSize;
    const textElem = document.querySelector(".glyph-letter svg text");
    if (textElem) {
      textElem.setAttribute("font-size", newFontSize);
    }
    updateGlyphPreview();
  });

  // Append containers to the control section.
  glyphControl.appendChild(unicodeContainer);
  glyphControl.appendChild(modeSwitchContainer);
  glyphControl.appendChild(sliderContainer);
  glyphControl.appendChild(fontSizeSliderContainer);

  // Mode switching: update classes and SVG text attributes.
  solidBtn.addEventListener("click", () => {
    glyphLetter.classList.remove("outline");
    glyphLetter.classList.add("solid");
    const svgText = glyphLetter.querySelector("text");
    if (svgText) {
      svgText.setAttribute("fill", "white");
      svgText.removeAttribute("stroke");
      svgText.removeAttribute("stroke-width");
    }
  });

  outlineBtn.addEventListener("click", () => {
    glyphLetter.classList.remove("solid");
    glyphLetter.classList.add("outline");
    const svgText = glyphLetter.querySelector("text");
    if (svgText) {
      svgText.setAttribute("fill", "none");
      svgText.setAttribute("stroke", "white");
      svgText.setAttribute("stroke-width", "1");
    }
  });
}

/**
 * Loads metrics for the current font and makes them available for other uses.
 * It retrieves the font file from the font data and uses opentype.js to extract
 * the ascender, descender and x-height (from OS/2 table if available).
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
      return;
    }

    // Retrieve metric stats.
    const ascender = loadedFont.ascender;
    const descender = loadedFont.descender;
    let xHeight = "N/A";
    let capHeight = "N/A";
    if (loadedFont.tables.os2) {
      if (loadedFont.tables.os2.sxHeight) {
        xHeight = loadedFont.tables.os2.sxHeight;
      }
      if (loadedFont.tables.os2.sCapHeight) {
        capHeight = loadedFont.tables.os2.sCapHeight;
      }
    }

    // Save metrics globally.
    window.currentFontMetrics = {
      ascender,
      descender,
      xHeight,
      capHeight,
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

  const { descender, xHeight, capHeight } = window.currentFontMetrics;

  // Compute the full range in font units using capHeight instead of ascender.
  const glyphRange = capHeight + Math.abs(descender); // expected positive

  // Compute scale factor so the entire range fits into the preview.
  const previewHeight = 350;
  const scaleFactor = previewHeight / glyphRange;

  // Update the text element's font-size using the scale factor.
  const fontSize = 1000 * scaleFactor;
  textElem.setAttribute("font-size", fontSize);

  // Compute a default baseline so that the font's descender maps to the bottom.
  const defaultBaseline = previewHeight - Math.abs(descender) * scaleFactor;

  // Use the slider-controlled baseline if available, otherwise the default.
  const baseline = window.currentBaseline !== undefined
    ? parseInt(window.currentBaseline, 10)
    : defaultBaseline;

  // Calculate the metric line positions.
  const capHeightY = baseline - capHeight * scaleFactor;
  const descenderY = baseline + Math.abs(descender) * scaleFactor;
  const xHeightY = baseline - xHeight * scaleFactor;

  // Update the SVG metric lines.
  const baselineLine = svg.querySelector("#baselineLine");
  const capHeightLine = svg.querySelector("#capHeightLine");
  const descenderLine = svg.querySelector("#descenderLine");
  const xHeightLine = svg.querySelector("#xHeightLine");

  if (baselineLine) {
    baselineLine.setAttribute("y1", baseline);
    baselineLine.setAttribute("y2", baseline);
  }
  if (capHeightLine) {
    capHeightLine.setAttribute("y1", capHeightY);
    capHeightLine.setAttribute("y2", capHeightY);
  } else {
    // Create the cap height line if it doesn't exist
    const newCapHeightLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    newCapHeightLine.setAttribute("id", "capHeightLine");
    newCapHeightLine.setAttribute("x1", "0");
    newCapHeightLine.setAttribute("x2", "100%");
    newCapHeightLine.setAttribute("stroke", "orange");
    newCapHeightLine.setAttribute("stroke-width", "1");
    newCapHeightLine.setAttribute("y1", capHeightY);
    newCapHeightLine.setAttribute("y2", capHeightY);
    svg.appendChild(newCapHeightLine);
  }
  if (descenderLine) {
    descenderLine.setAttribute("y1", descenderY);
    descenderLine.setAttribute("y2", descenderY);
  }
  if (xHeightLine) {
    xHeightLine.setAttribute("y1", xHeightY);
    xHeightLine.setAttribute("y2", xHeightY);
  }

  // Update the y attribute so that the text baseline matches the computed baseline.
  textElem.setAttribute("y", baseline);

  // Ensure the text uses baseline alignment.
  textElem.setAttribute("dominant-baseline", "alphabetic");

  // Remove any existing metric labels.
  const oldLabels = svg.querySelectorAll(".metric-label");
  oldLabels.forEach((lbl) => lbl.remove());

  // Helper function to create a label.
  function addMetricLabel(yPos, labelText, color) {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", "5"); // 5px from left side
    label.setAttribute("y", yPos - 5); // slightly above the line
    label.setAttribute("fill", color);
    label.setAttribute("font-size", "12");
    label.classList.add("metric-label");
    label.textContent = labelText;
    svg.appendChild(label);
  }

  // Add labels for each metric line with raw values.
  addMetricLabel(baseline, `Baseline: 0`, "red");
  addMetricLabel(capHeightY, `Cap Height: ${capHeight}`, "orange");
  addMetricLabel(descenderY, `Descender: ${descender}`, "purple");
  addMetricLabel(xHeightY, `xHeight: ${xHeight}`, "green");

  // Update the font size slider value
  const fontSizeSlider = document.getElementById("fontSizeSlider");
  if (fontSizeSlider) {
    fontSizeSlider.value = fontSize;
    document.getElementById("fontSizeValue").textContent = fontSize.toFixed(2);
  }
}

// ========================================
// DOMContentLoaded Initialization
// ========================================

document.addEventListener("DOMContentLoaded", async () => {
  await initFontProfile();
  initGlyphGrid();
  initControlSection();
  await initFontMetrics();
  updateGlyphPreview();
});
