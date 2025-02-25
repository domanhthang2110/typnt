// scripts.js

// Constants and Variables
const categoriesButton = document.getElementById("categoriesButton");
const dropdownContent = document.getElementById("dropdownContent");
const triangle = document.getElementById("triangle");
const listViewBtn = document.getElementById("listViewBtn");
const gridViewBtn = document.getElementById("gridViewBtn");
const fontContainer = document.getElementById("font-container");
const searchInput = document.querySelector('input[placeholder="Search"]');
const masterSlider = document.querySelector(".master-slider");
const fontsPerPage = 20;
let currentFontIndex = 0;
let fontsData = [];
const googleFontsAPI =
  "https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyBJr2Qgi8BBZ0eAMid_JNP96o7Pp328cYY";

// Event Listeners
document.addEventListener("DOMContentLoaded", initApp);

// Functions
async function initApp() {
  fontsData = await fetchLocalFontsData();
  loadFonts(fontsData.items.slice(0, fontsPerPage));
  displayFonts(fontsData.items.slice(0, fontsPerPage));
  currentFontIndex += fontsPerPage;
  setupEventListeners();
  setupIntersectionObserver();
}

// Function to setup Intersection Observer
function setupIntersectionObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMoreFonts();
      }
    },
    {
      root: null,
      rootMargin: "0px",
      threshold: 1.0,
    }
  );

  observer.observe(document.querySelector("#load-more-trigger"));
}

function loadMoreFonts() {
  const nextFonts = fontsData.items.slice(
    currentFontIndex,
    currentFontIndex + fontsPerPage
  );
  loadFonts(nextFonts);
  displayFonts(nextFonts);
  currentFontIndex += fontsPerPage;
}
// Function to load fonts using Web Font Loader
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

// Load font data from the local JSON file
async function fetchLocalFontsData() {
  const response = await fetch("fonts.json");
  return await response.json();
}

function createFontDataMap(fontsData) {
  return fontNames.reduce((acc, fontName) => {
    const fontDetails = fontsData.items.find(
      (item) => item.family === fontName
    );
    if (!fontDetails) {
      console.log(`Font details not found for: ${fontName}`);
    }
    if (fontDetails) {
      console.log(`Font details found for: ${fontName}`);
      const weights = [
        ...new Set(
          fontDetails.variants
            .map((variant) =>
              parseInt(variant.replace("italic", "").replace("regular", "400"))
            )
            .filter((weight) => !isNaN(weight))
        ),
      ].sort((a, b) => a - b);

      acc[fontName] = {
        details: fontDetails,
        weights: weights,
        minWeight: weights[0],
        maxWeight: weights[weights.length - 1],
      };
      console.log(acc);
    }
    return acc;
  }, {});
}

function displayFonts(fontData) {
  const fragment = document.createDocumentFragment();
  fontData.forEach((font) => {
    const card = createFontCard(font);
    fragment.appendChild(card);
  });
  fontContainer.appendChild(fragment);
}

function createFontCard(fontData) {
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

  const name = document.createElement("h3");
  name.innerText = fontData.family;
  name.classList.add("text-sm", "text-white");

  // Create an anchor element
  const link = document.createElement("a");
  link.href = `glyph.html?font=${encodeURIComponent(fontData.family)}`;
  link.appendChild(name);

  const stylesCount = document.createElement("p");
  stylesCount.innerText = `${fontData.variants.length} styles`;
  stylesCount.classList.add("text-sm", "text-gray-400");

  // Create the slider
  const weightSlider = document.createElement("input");
  weightSlider.type = "range";
  weightSlider.min = 12;
  weightSlider.max = 210;
  weightSlider.value = 96;
  weightSlider.classList.add("slider", "self-start");

  const variantDropdown = createVariantDropdown(fontData.variants, card);
  variantDropdown.querySelector("div").addEventListener("change", (e) => {
    const selectedVariant = e.target.value;
    const button = variantDropdown.querySelector("button");
    const buttonText = button.querySelector("span:first-child");
    buttonText.textContent = translateWeightToName(selectedVariant);
    if (selectedVariant === "regular") {
      sample.style.fontWeight = "400";
      sample.style.fontStyle = "normal";
      return;
    }
    sample.style.fontWeight = selectedVariant.replace("italic", "") || "400";
    sample.style.fontStyle = selectedVariant.includes("italic")
      ? "italic"
      : "normal";
  });

  let isDragging = false;

  weightSlider.addEventListener("input", (e) => {
    const rawValue = parseInt(e.target.value);
    const percent = (rawValue / 210) * 100 - 2;
    weightSlider.style.setProperty("--split-percent", `${percent}%`);
    sample.style.fontSize = `${rawValue}px`;
    sample.style.lineHeight = `${rawValue * 1.4}px`;
  });

  weightSlider.addEventListener("mouseenter", () => {
    weightSlider.style.setProperty("--grey-opacity", "1");
  });

  weightSlider.addEventListener("mouseleave", () => {
    if (!isDragging) {
      weightSlider.style.setProperty("--grey-opacity", "0");
    }
  });

  weightSlider.addEventListener("mousedown", () => {
    isDragging = true;
    weightSlider.style.setProperty("--grey-opacity", "1");
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      weightSlider.style.setProperty("--grey-opacity", "0");
    }
  });

  const sampleContainer = document.createElement("div");
  sampleContainer.classList.add("card-sample-container");

  const sample = document.createElement("p");
  sample.innerText = fontData.family;
  sample.style.fontFamily = `'${fontData.family}', sans-serif`;
  sample.classList.add("card-sample", "text-8xl", "mt-4", "mb-4", "outline-none");
  sample.contentEditable = true;

  sampleContainer.appendChild(sample);

  const sourceType = document.createElement("p");
  sourceType.innerText = Math.random() > 0.5 ? "Open source" : "Closed source";
  sourceType.classList.add("text-sm", "text-gray-400");

  const designer = document.createElement("p");
  designer.innerText = `Designed by ${fontData.designer}`;
  designer.classList.add("text-sm", "text-gray-400");

  // Create a nested flex container for the link, slider, and variant dropdown
  const linkContainer = document.createElement("div");
  linkContainer.classList.add("flex", "items-center", "space-x-4");
  linkContainer.appendChild(link);
  linkContainer.appendChild(weightSlider);
  linkContainer.appendChild(variantDropdown);

  const topContainer = document.createElement("div");
  topContainer.classList.add("flex", "justify-between", "items-center", "w-full");
  topContainer.appendChild(linkContainer);
  topContainer.appendChild(stylesCount);

  const bottomContainer = document.createElement("div");
  bottomContainer.classList.add("justify-between", "items-center", "w-full", "absolute", "bottom-2", "left-2");
  bottomContainer.appendChild(sourceType);
  bottomContainer.appendChild(designer);

  card.appendChild(topContainer);
  card.appendChild(sampleContainer);
  card.appendChild(bottomContainer);

  return card;
}

function createVariantDropdown(variants, card) {
  const dropdown = document.createElement("div");
  dropdown.className = "relative max-w-48 variantDropdown";

  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "relative z-40 bg-[#040A10] text-white py-2 px-4 transition-all duration-200 flex items-center gap-2 dropdown-button opacity-0";
  button.innerHTML = `<span>${translateWeightToName(
    "regular"
  )}</span><span class="ml-1 text-xl dd-triangle">▾</span>`;

  const triangle = button.querySelector(".dd-triangle");

  const dropdownContent = document.createElement("div");
  dropdownContent.className = `
    py-1 absolute -left-2 pl-2
    transition-all duration-200 ease-in-out 
    opacity-0 -translate-y-1 invisible 
    bg-[#040A10] w-full z-20
    max-h-64 overflow-hidden top-full -mt-12 ml-1 dropdown-content
  `;

  const contentWrapper = document.createElement("div");
  contentWrapper.className = "dropdown-content-wrapper custom-scrollbar";
  contentWrapper.style.marginTop = "70px";
  contentWrapper.style.maxHeight = "150px";
  contentWrapper.style.overflowY = "auto";

  const randomId = `variant-${Math.random().toString(36).substring(2, 10)}`;
  variants.forEach((variant) => {
    const label = document.createElement("label");
    label.className = "block px-2 py-2 text-sm";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = randomId;
    input.value = variant;

    if (variant === "regular") {
      input.checked = true;
    }

    const labelText = document.createTextNode(
      ` ${translateWeightToName(variant)}`
    );

    label.appendChild(input);
    label.appendChild(labelText);
    contentWrapper.appendChild(label);
  });

  dropdownContent.appendChild(contentWrapper);

  let isDropdownVisible = false;
  let wasDropdownVisible = false;

  dropdown.appendChild(button);
  dropdown.appendChild(dropdownContent);

  function updateDropdownState(visible) {
    isDropdownVisible = visible;
    if (visible) {
      dropdownContent.classList.add(
        "opacity-100",
        "visible",
        "border",
        "border-[#4F4F4F]"
      );
      dropdownContent.classList.remove("opacity-0", "invisible");
      button.classList.add("text-white");
      triangle.classList.add("rotate-triangle");
    } else {
      dropdownContent.classList.remove(
        "opacity-100",
        "visible",
        "border",
        "border-[#4F4F4F]"
      );
      dropdownContent.classList.add("opacity-0", "invisible");
      button.classList.remove("text-white");
      triangle.classList.remove("rotate-triangle");
    }
  }

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    updateDropdownState(!isDropdownVisible);
    wasDropdownVisible = !wasDropdownVisible;
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) {
      updateDropdownState(false);
      wasDropdownVisible = false;
    }
  });

  card.addEventListener("mouseenter", () => {
    if (wasDropdownVisible) {
      updateDropdownState(true);
    }
  });

  card.addEventListener("mouseleave", () => {
    if (isDropdownVisible) {
      updateDropdownState(false);
    }
  });

  return dropdown;
}

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

export function translateWeightToName(weight) {


  if (weight === "regular") return "Regular";
  if (weight === "italic") return "Italic";

  if (weightNames[weight]) return weightNames[weight];

  const weightWithoutItalic = weight.replace("italic", "");
  if (weightWithoutItalic && weightNames[weightWithoutItalic]) {
    return weightNames[weightWithoutItalic] + " Italic";
  }

  return weight;
}

function setupEventListeners() {
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredFonts = fontsData.items.filter((font) =>
      font.family.toLowerCase().startsWith(searchTerm)
    );

    // Reset currentFontIndex for new search results
    currentFontIndex = 0;

    // Clear existing font cards
    fontContainer.innerHTML = "";

    // Display the first 20 filtered results
    displayFonts(filteredFonts.slice(0, fontsPerPage));
    currentFontIndex += fontsPerPage;

    // Update the Intersection Observer to load more filtered results
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreFilteredFonts(filteredFonts);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 1.0,
      }
    );

    observer.observe(document.querySelector("#load-more-trigger"));
  });

  const masterSlider = document.querySelector(".master-slider");
  const sliderValue = document.getElementById("sliderValue");

  let isDragging = false;
  let animationFrameId = null;

  masterSlider.addEventListener("input", (e) => {
    const rawValue = parseInt(e.target.value);
    const percent = ((rawValue - 12) / (210 - 12)) * 100; // Adjust the range to 12-100
    masterSlider.style.setProperty("--split-percent", `${percent}%`);
    sliderValue.textContent = rawValue + " px";

    if (!isDragging) {
      isDragging = true;
      updateSamples(rawValue);
    }
  });

  function updateSamples(rawValue) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(() => {
      const samples = document.querySelectorAll(".card-sample");

      samples.forEach((sample) => {
        sample.style.fontSize = `${rawValue}px`;
        sample.style.lineHeight = `${rawValue * 1.4}px`;
      });

      isDragging = false;
    });
  }

  categoriesButton.addEventListener("click", () => {
    triangle.classList.toggle("rotate-triangle");
    categoriesButton.classList.toggle("border-transparent");
    categoriesButton.classList.toggle("border-[#4F4F4F]");
    categoriesButton.classList.toggle("text-white");
    dropdownContent.classList.toggle("opacity-100");
    dropdownContent.classList.toggle("invisible");
    dropdownContent.classList.toggle("border");
    dropdownContent.classList.toggle("border-[#4F4F4F]");
  });

  document.addEventListener("click", (event) => {
    if (
      !categoriesButton.contains(event.target) &&
      !dropdownContent.contains(event.target)
    ) {
      dropdownContent.classList.add("opacity-0");
      dropdownContent.classList.remove("opacity-100");
      dropdownContent.classList.add("invisible");
      dropdownContent.classList.remove("border", "border-[#4F4F4F]");
      categoriesButton.classList.remove("text-white", "border-[#4F4F4F]");
      categoriesButton.classList.add("border-transparent");
      triangle.classList.remove("rotate-triangle");
    }
  });

  const radioButtons = document.querySelectorAll('input[name="category"]');
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const selectedCategory = e.target.value;
      const fontCards = document.querySelectorAll("#font-container > div");

      fontCards.forEach((card) => {
        const fontName = card.querySelector("h3").innerText;
        const fontData = fontDataMap[fontName];

        card.style.display =
          selectedCategory === "all" ||
          fontData.details.category === selectedCategory
            ? "block"
            : "none";
      });
    });
  });

  listViewBtn.addEventListener("click", () => {
    fontContainer.classList.remove("grid", "grid-cols-4", "gap-y-0");
    fontContainer.classList.add("flex", "flex-col", "space-y-6");
    listViewBtn.classList.remove("text-[#9c9c9c]");
    listViewBtn.classList.add("text-white");
    gridViewBtn.classList.remove("text-white");
    gridViewBtn.classList.add("text-[#9c9c9c]");
  });

  gridViewBtn.addEventListener("click", () => {
    fontContainer.classList.remove("flex", "flex-col", "space-y-6");
    fontContainer.classList.add("grid", "grid-cols-4", "gap-y-0");
    listViewBtn.classList.add("text-[#9c9c9c]");
    listViewBtn.classList.remove("text-white");
    gridViewBtn.classList.add("text-white");
    gridViewBtn.classList.remove("text-[#9c9c9c]");
    document.querySelectorAll("#font-container > .card").forEach((card) => {
      card.classList.remove("mb-6", "space-y-6");
      card.classList.add("m-0");
    });
  });

  // Alignment buttons event listeners
  const alignLeftBtn = document.getElementById("alignLeftBtn");
  const alignCenterBtn = document.getElementById("alignCenterBtn");
  const alignRightBtn = document.getElementById("alignRightBtn");

  alignLeftBtn.addEventListener("click", () => {
    document.querySelectorAll(".card-sample").forEach((sample) => {
      sample.classList.remove("align-center", "align-right");
      sample.classList.add("align-left");
    });
  });

  alignCenterBtn.addEventListener("click", () => {
    document.querySelectorAll(".card-sample").forEach((sample) => {
      sample.classList.remove("align-left", "align-right");
      sample.classList.add("align-center");
    });
  });

  alignRightBtn.addEventListener("click", () => {
    document.querySelectorAll(".card-sample").forEach((sample) => {
      sample.classList.remove("align-left", "align-center");
      sample.classList.add("align-right");
    });
  });

  // Event listener for key presses
  document.addEventListener("keydown", (event) => {
    // Check if the 'O' key is pressed (you can change this to any key you prefer)
    if (event.key === "o" || event.key === "O") {
      toggleOutline();
    }
  });
}

// Flag to track the outline state
let outlineEnabled = false;

// Function to toggle the outline
function toggleOutline() {
  if (outlineEnabled) {
    const styleElement = document.querySelector('style#outline-style');
    if (styleElement) {
      styleElement.remove();
    }
  } else {
    const style = document.createElement('style');
    style.id = 'outline-style';
    style.innerHTML = '* { outline: 1px solid red; }';
    document.head.appendChild(style);
  }
  outlineEnabled = !outlineEnabled;
}

function loadMoreFilteredFonts(filteredFonts) {
  const nextFonts = filteredFonts.slice(
    currentFontIndex,
    currentFontIndex + fontsPerPage
  );
  loadFonts(nextFonts);
  displayFonts(nextFonts);
  currentFontIndex += fontsPerPage;
}