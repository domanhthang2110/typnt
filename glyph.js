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

  // Populate both uppercase and lowercase with a single loop.
  for (let i = 65; i <= 90; i++) {
    const upper = String.fromCharCode(i);
    const lower = String.fromCharCode(i + 32);

    // Uppercase cell using the universal CSS class.
    const uppercaseCell = document.createElement("div");
    uppercaseCell.classList.add("grid-cell"); // apply universal style
    uppercaseCell.innerText = upper;
    uppercaseCell.style.fontFamily = pageFont;
    uppercaseCell.addEventListener("click", () => {
      glyphLetter.innerText = upper;
    });
    uppercaseGrid.appendChild(uppercaseCell);

    // Lowercase cell using the universal CSS class.
    const lowercaseCell = document.createElement("div");
    lowercaseCell.classList.add("grid-cell");
    lowercaseCell.innerText = lower;
    lowercaseCell.style.fontFamily = pageFont;
    lowercaseCell.addEventListener("click", () => {
      glyphLetter.innerText = lower;
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
      glyphLetter.innerText = num;
    });
    numeralsGrid.appendChild(cell);
  });
  numeralsSection.appendChild(numeralsGrid);

  // --- Punctuation Section (Unicode U+0021 to U+002F) ---
  const punctuationSection = document.createElement("div");
  punctuationSection.innerHTML =
    "<h3 class='text-center font-bold mt-4 mb-2'>Punctuation</h3>";
  const punctuationGrid = document.createElement("div");
  punctuationGrid.style.display = "grid";
  punctuationGrid.style.gridTemplateColumns = "repeat(8, 1fr)";
  punctuationGrid.style.gap = "0";

  // Create punctuation marks from Unicode 0021 (!) to 002F (/)
  const punctuationMarks = Array.from({ length: 0x2f - 0x21 + 1 }, (_, i) =>
    String.fromCharCode(0x21 + i)
  );

  punctuationMarks.forEach((punct) => {
    const cell = document.createElement("div");
    cell.classList.add("grid-cell");
    cell.innerText = punct;
    cell.style.fontFamily = pageFont;
    cell.addEventListener("click", () => {
      glyphLetter.innerText = punct;
    });
    punctuationGrid.appendChild(cell);
  });
  punctuationSection.appendChild(punctuationGrid);

  // Append all sections to the glyph grid container.
  glyphGrid.appendChild(uppercaseSection);
  glyphGrid.appendChild(lowercaseSection);
  glyphGrid.appendChild(numeralsSection);
  glyphGrid.appendChild(punctuationSection);

  // Set an initial preview if not already set.
  glyphLetter.innerText = "A";
}


// ========================================
// DOMContentLoaded Initialization
// ========================================

document.addEventListener("DOMContentLoaded", async () => {
  await initFontProfile();
  initGlyphGrid();
});
