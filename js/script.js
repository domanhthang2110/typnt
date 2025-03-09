// scripts.js

import { GoogleFontsLoader } from "./modules/google-fonts-loader.js";

// Simplify constants
const fontContainer = document.getElementById("font-container");
const searchInput = document.querySelector('input[placeholder="Search"]');
const masterSlider = document.querySelector(".master-slider");
const sliderValue = document.getElementById("sliderValue");
const loadingIndicator = document.getElementById("loading-indicator");
let isUpdating = false;

// Keep essential categories
const categories = [
  "all",
  "serif",
  "sans-serif",
  "display",
  "handwriting",
  "monospace",
];
let currentCategory = "all";

let currentState = {
  category: "all",
  page: 0,
  hasMore: true,
  totalFonts: 0,
  masterFontSize: 96,
  searchTerm: "",
  viewMode: "list",
  textAlign: "left",
  sortBy: "alphabetical", // Default sort method
};

// Create a global instance of the GoogleFontsLoader
let googleFontsLoader;

// Event Listeners
document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  try {
    showLoading(true);

    // Initialize the Google Fonts loader with the fonts.json file
    googleFontsLoader = await GoogleFontsLoader.fromJson("/data/fontinfo.json");

    // Set initial view mode class
    fontContainer.classList.add(`${currentState.viewMode}-view`);
    updateViewButtonStates();
    
    // Make sure left alignment is the default
    currentState.textAlign = "left";
    updateAlignButtonStates(currentState.textAlign);

    // Load and display the first batch of fonts
    await loadAndDisplayFonts(true);

    setupEventListeners();
    setupIntersectionObserver();

    showLoading(false);
  } catch (error) {
    console.error("Failed to initialize app:", error);
    fontContainer.innerHTML =
      '<div class="text-center text-red-400">Failed to load fonts</div>';
    showLoading(false);
  }
}

async function loadAndDisplayFonts(reset = false) {
  if (isUpdating) return;
  isUpdating = true;

  if (reset) {
    currentState.page = 0;
    fontContainer.innerHTML = "";
    showLoading(true);
  }

  try {
    // Get fonts based on current filters
    const pageSize = 20; // Number of fonts to load per batch
    const skip = currentState.page * pageSize;

    // Determine which fonts to fetch based on filters and sorting
    let fonts = [];
    let totalFonts = 0;

    // Use the new sorting method from GoogleFontsLoader
    const sortedFonts = googleFontsLoader.getSortedFonts(
      currentState.sortBy,
      currentState.category,
      currentState.searchTerm
    );

    totalFonts = sortedFonts.length;
    fonts = sortedFonts.slice(skip, skip + pageSize);

    // Create a result object to match the expected format
    const result = {
      fonts: fonts,
      totalFonts: totalFonts,
      hasMore: skip + pageSize < totalFonts,
    };

    // Update total count regardless of whether fonts were found
    currentState.totalFonts = result.totalFonts;
    const totalEntry = document.querySelector(".total-entry");
    if (totalEntry) {
      totalEntry.textContent = `${result.totalFonts} Total`;
    }

    if (result.fonts.length > 0) {
      // Pre-load the fonts we're about to display
      const fontNames = result.fonts.map((font) => font.name);
      await googleFontsLoader.loadFonts(fontNames);

      // Use a try-catch here to handle errors in individual font cards
      try {
        displayFonts(result.fonts, !reset);
      } catch (displayError) {
        console.warn("Error displaying some fonts:", displayError);
      }
      currentState.hasMore = result.hasMore;
      currentState.page++;
    } else if (reset) {
      fontContainer.innerHTML =
        '<div class="text-center text-gray-400">No fonts found</div>';
      currentState.hasMore = false;
    }
  } catch (error) {
    console.error("Error loading fonts:", error);
    // Display a user-friendly error message
    if (reset) {
      fontContainer.innerHTML =
        '<div class="text-center text-red-400">Could not load fonts. Please try again later.</div>';
    }
  } finally {
    isUpdating = false;
    showLoading(false);
  }
}

function createFontCard(fontData) {
  // Just add the basic card class - all other styling comes from CSS
  const card = document.createElement("div");
  card.classList.add("card");

  // Check if this is an enhanced font with detailed info
  const isEnhancedFont = !!fontData.detailedInfo;

  // Fix variable font detection logic
  const isVariable =
    (isEnhancedFont && fontData.detailedInfo.isVariable) ||
    (fontData.axes && Object.keys(fontData.axes).length > 0);

  // Get the font designer - fallback to 'Unknown' if not available
  const designer =
    fontData.designer || fontData.detailedInfo?.name || "Unknown";

  // Get font name
  const fontName = fontData.family || fontData.name;

  // Use the same method as layout.js to get variants count
  const variants = googleFontsLoader.getFontVariants(fontName);
  const stylesCount = variants.length;

  // Add "Variable" indicator for variable fonts
  const variableBadge = isVariable
    ? '<span class="variable-badge">Variable</span>'
    : "";

  card.innerHTML = `
        <div class="card-header">
            <div class="card-title">
                <a href="glyph.html?font=${encodeURIComponent(fontName)}">
                    <h3>${fontName}</h3>
                </a>
            </div>
            
            <div class="card-controls">
    <div class="slider-container">
        <span class="slider-title">Size</span>
        <input type="range" min="12" max="210" value="${
          currentState.masterFontSize
        }" class="slider" data-slider-type="size">
    </div>
    <div class="slider-container">
        <span class="slider-title">Weight</span>
        <input type="range" min="100" max="900" step="5" value="400" class="slider" data-slider-type="weight">
    </div>
    ${createVariantDropdownHTML(fontData)}
</div>
            
            <div class="card-info">
                ${variableBadge}
                <p class="styles-count">${stylesCount} styles</p>
            </div>
        </div>
        
        <div class="card-sample-container">
            <p class="card-sample align-${currentState.textAlign}" 
               contenteditable="true" 
               style="font-family: '${fontName}', sans-serif; font-size: ${currentState.masterFontSize}px; line-height: ${currentState.masterFontSize * 1.4}px; font-weight: 400;">
                ${fontName}
            </p>
            <div class="font-size-indicator">${
              currentState.masterFontSize
            }px</div>
        </div>
        
        <div class="card-footer">
            <p>Designed by ${designer}</p>
        </div>
    `;

  setupCardInteractions(card, fontData);
  return card;
}

function createVariantDropdownHTML(fontData) {
  // Generate a unique ID for this card's radio group
  const radioGroupName = `variant-${Math.random().toString(36).substr(2, 9)}`;

  // Use the getFontVariants method to get all variants for this font
  const fontName = fontData.family || fontData.name;
  const variants = googleFontsLoader.getFontVariants(fontName);

  // Find the default variant (regular/400 normal) to mark as checked
  const defaultVariantIndex =
    variants.findIndex((v) => v.weight === 400 && v.style === "normal") || 0;

  // Generate options for each variant
  const options = variants
    .map((variant, index) => {
      const isDefault = index === defaultVariantIndex;

      // Generate a value attribute for the radio button
      const valueAttr = `${variant.weight}${
        variant.style === "italic" ? "italic" : ""
      }`;

      return `<label class="block px-2 py-2">
            <input type="radio" name="${radioGroupName}" 
                data-weight="${variant.weight}" 
                data-style="${variant.style}"
                value="${valueAttr}" 
                ${isDefault ? "checked" : ""}>
            ${variant.display}
        </label>`;
    })
    .join("");

  return `
        <div class="relative variantDropdown">
            <button type="button" class="dropdown-button relative z-40 text-white 
                    transition-all duration-200 flex items-center gap-2 opacity-0">
                <span>${googleFontsLoader.translateWeightToName(
                  "regular"
                )}</span>
                <span class="ml-1 text-xl dd-triangle">▾</span>
            </button>
            <div class="absolute pl-2 transition-all duration-200 ease-in-out 
                        opacity-0 invisible w-full z-20 overflow-hidden dropdown-content">
                <div class="dropdown-content-wrapper overflow-y-auto" 
                     style="margin-top: 40px; max-height: 150px;">
                    <div class="pr-2">
                        ${options}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupCardInteractions(card, fontData) {
  const sample = card.querySelector(".card-sample");
  const sizeSlider = card.querySelector('.slider[data-slider-type="size"]');
  const weightSlider = card.querySelector('.slider[data-slider-type="weight"]');
  const indicator = card.querySelector(".font-size-indicator");
  const variantDropdown = card.querySelector(".variantDropdown");
  const sizeTitleElement = sizeSlider.parentNode.querySelector(".slider-title");
  const weightTitleElement =
    weightSlider.parentNode.querySelector(".slider-title");
  // Get the font name from fontData
  const fontName = fontData.family || fontData.name;

  // Add this code to setupCardInteractions function after getting fontName
  const isVariableFont = googleFontsLoader.isVariableFont(fontName);

  // Create default weight settings
  let weightSettings = { min: 100, max: 900, default: 400, step: 5 };

  // For variable fonts, check for custom weight axis
  if (isVariableFont) {
    const fontObj = googleFontsLoader.getFont(fontName);
    if (fontObj && fontObj.axes && fontObj.axes.wght) {
      weightSettings.min = fontObj.axes.wght.min || 100;
      weightSettings.max = fontObj.axes.wght.max || 900;

      // Set a sensible default within the range
      weightSettings.default = Math.max(
        Math.min(400, weightSettings.max),
        weightSettings.min
      );
    }
  }

  // Apply settings to the weight slider
  weightSlider.min = weightSettings.min;
  weightSlider.max = weightSettings.max;
  weightSlider.step = weightSettings.step;
  weightSlider.value = weightSettings.default;

  // Update the slider visual to match the actual range
  updateSliderVisual(
    weightSlider,
    weightSettings.default,
    weightSettings.min,
    weightSettings.max
  );

  // Add card hover handlers
  card.addEventListener("mouseenter", () => {
    // Only restore if dropdown was in open state
    if (variantDropdown.classList.contains("dropdown-open")) {
      showDropdownContent(variantDropdown);
    }
  });

  card.addEventListener("mouseleave", () => {
    // Hide content but maintain open state
    hideDropdownContent(variantDropdown);
  });

  // Size slider interaction
  sizeSlider.addEventListener("input", (e) => {
    const size = parseInt(e.target.value);
    updateSampleSize(sample, size);
    updateSliderVisual(sizeSlider, size, 12, 210);
    showSizeIndicator(indicator, size);
    // Update title to show value
    sizeTitleElement.textContent = `${size}px`;
    sizeTitleElement.classList.add("showing-value");
  });

  sizeSlider.addEventListener("mouseout", () => {
    // Reset title when not interacting
    setTimeout(() => {
      sizeTitleElement.textContent = "Size";
      sizeTitleElement.classList.remove("showing-value");
    }, 1000);
  });

  // Weight slider interaction
  weightSlider.addEventListener("input", (e) => {
    const weight = parseInt(e.target.value);
    updateFontWeight(sample, weight, weightSettings);
    updateSliderVisual(
      weightSlider,
      weight,
      weightSettings.min,
      weightSettings.max
    );
    // Update title to show value
    weightTitleElement.textContent = weight;
    weightTitleElement.classList.add("showing-value");
  });

  weightSlider.addEventListener("mouseout", () => {
    // Reset title when not interacting
    setTimeout(() => {
      weightTitleElement.textContent = "Weight";
      weightTitleElement.classList.remove("showing-value");
    }, 1000);
  });

  setupVariantDropdown(variantDropdown, sample, fontData);
}

function updateFontWeight(sampleElement, weight, weightSettings) {
  if (!sampleElement) return;

  // Clamp the weight to the actual range for this font
  const validWeight = Math.min(
    Math.max(weight, weightSettings.min),
    weightSettings.max
  );

  // Update font weight
  sampleElement.style.fontWeight = validWeight;

  // For variable fonts, we might want to use font-variation-settings
  const currentVariationSettings = sampleElement.style.fontVariationSettings;
  if (currentVariationSettings) {
    // Extract existing settings
    const settings = currentVariationSettings
      .split(",")
      .map((setting) => setting.trim())
      .filter((setting) => !setting.startsWith("'wght'"));

    // Add weight setting
    settings.push(`'wght' ${validWeight}`);

    // Apply updated settings
    sampleElement.style.fontVariationSettings = settings.join(", ");
  }
}

// Helper functions for dropdown content
function showDropdownContent(dropdown) {
  const button = dropdown.querySelector(".dropdown-button");
  const dropdownContent = dropdown.querySelector(".dropdown-content");
  const triangle = button.querySelector(".dd-triangle");

  button.style.backgroundColor = "transparent";
  dropdownContent.classList.add(
    "opacity-100",
    "visible",
    "border",
    "border-[#4F4F4F]"
  );
  dropdownContent.classList.remove("opacity-0", "invisible");
  triangle.classList.add("rotate-triangle");
}

function hideDropdownContent(dropdown) {
  const button = dropdown.querySelector(".dropdown-button");
  const dropdownContent = dropdown.querySelector(".dropdown-content");
  const triangle = button.querySelector(".dd-triangle");

  button.style.backgroundColor = "";
  dropdownContent.classList.remove(
    "opacity-100",
    "visible",
    "border",
    "border-[#4F4F4F]"
  );
  dropdownContent.classList.add("opacity-0", "invisible");
  triangle.classList.remove("rotate-triangle");
}

function setupVariantDropdown(variantDropdown, sample, fontData) {
  let isDropdownVisible = false;
  const button = variantDropdown.querySelector(".dropdown-button");
  const dropdownContent = variantDropdown.querySelector(".dropdown-content");
  const fontName = fontData.family || fontData.name;
  const isVariableFont = googleFontsLoader.isVariableFont(fontName);

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    isDropdownVisible = !isDropdownVisible;

    if (isDropdownVisible) {
      variantDropdown.classList.add("dropdown-open");
      showDropdownContent(variantDropdown);
    } else {
      variantDropdown.classList.remove("dropdown-open");
      hideDropdownContent(variantDropdown);
    }
  });

  document.addEventListener("click", (e) => {
    if (isDropdownVisible && !variantDropdown.contains(e.target)) {
      isDropdownVisible = false;
      variantDropdown.classList.remove("dropdown-open");
      hideDropdownContent(variantDropdown);
    }
  });

  variantDropdown.addEventListener("change", async (e) => {
    if (!e.target.matches('input[type="radio"]')) return;

    const weight = parseInt(e.target.dataset.weight) || 400;
    const style = e.target.dataset.style || "normal";
    const buttonText = variantDropdown.querySelector("button span:first-child");

    // Update button text with selected variant name
    buttonText.textContent = googleFontsLoader.translateWeightToName(
      style === "italic" ? `${weight}italic` : weight
    );

    // For variable fonts, we might want to use font-variation-settings
    if (isVariableFont) {
      // Reset any previous variation settings
      sample.style.fontVariationSettings = "";

      // Apply the weight and style directly
      sample.style.fontWeight = weight;
      sample.style.fontStyle = style;

      // If the font has wght axis, we can use font-variation-settings for finer control
      const fontObj = googleFontsLoader.getFont(fontName);
      if (googleFontsLoader.isVariableFont(fontName)) {
        // Build variation settings focusing on weight axis
        const settings = [`'wght' ${weight}`];
        // Add italic axis if needed
        if (style === "italic" && fontObj.axes.ital) {
          settings.push(`'ital' 1`);
        }

        // Apply font variation settings
        sample.style.fontVariationSettings = settings.join(", ");

        const weightSlider = variantDropdown
          .closest(".card-controls")
          .querySelector('.slider[data-slider-type="weight"]');

        if (weightSlider) {
          weightSlider.value = weight;
          updateSliderVisual(
            weightSlider,
            weight,
            parseInt(weightSlider.min),
            parseInt(weightSlider.max)
          );
        }
      }
    } else {
      // Standard font
      sample.style.fontWeight = weight;
      sample.style.fontStyle = style;
    }

    // Load the appropriate font style
    const options = {
      weights: [weight],
      styles: [style],
    };

    await googleFontsLoader.loadFont(fontName, options);

    // Close dropdown after selection
    isDropdownVisible = false;
    variantDropdown.classList.remove("dropdown-open");
    hideDropdownContent(variantDropdown);
  });
}

function setupEventListeners() {
  // Categories filter
  const categoriesButton = document.getElementById("categoriesButton");
  const dropdownContent = document.getElementById("dropdownContent");
  const triangle = document.getElementById("triangle");

  // Fix dropdown toggle
  categoriesButton.addEventListener("click", (e) => {
    e.stopPropagation(); // Add this to prevent immediate closing
    const isExpanded = dropdownContent.classList.contains("visible");

    if (isExpanded) {
      closeDropdown(dropdownContent, triangle, categoriesButton);
    } else {
      openDropdown(dropdownContent, triangle, categoriesButton);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !categoriesButton.contains(e.target) &&
      !dropdownContent.contains(e.target)
    ) {
      closeDropdown(dropdownContent, triangle, categoriesButton);
    }
  });

  // Category radio buttons - THIS IS THE FIX
  const categoryRadios = document.querySelectorAll(
    'input[name="category-filter"]'
  );
  categoryRadios.forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      const category = e.target.value;
      if (currentState.category === category) return;

      // Update state and UI
      currentState.category = category;
      currentState.searchTerm = "";

      // Close dropdown and update UI
      closeDropdown(dropdownContent, triangle, categoriesButton);

      // Update button text with selected category name
      const categoryName = e.target.parentElement.textContent.trim();
      categoriesButton.querySelector("span:first-child").textContent =
        category === "all" ? "Categories" : categoryName;

      await loadAndDisplayFonts(true);
    });
  });

  // Properties filter checkboxes
  const propertyCheckboxes = document.querySelectorAll(
    'input[type="checkbox"][value]'
  );
  propertyCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {});
  });

  // Search functionality
  let searchTimeout = null;
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
      // Reset category when searching
      currentState.category = "all";
      currentState.searchTerm = searchTerm;
      updateCategoryButtonStates("all");

      // Update category button text
      const categoriesButton = document.getElementById("categoriesButton");
      if (categoriesButton) {
        categoriesButton.querySelector("span:first-child").textContent =
          "Categories";
      }

      await loadAndDisplayFonts(true);
    }, 300);
  });

  // Add master slider handler
  masterSlider.addEventListener("input", (e) => {
    const size = parseInt(e.target.value);
    currentState.masterFontSize = size;

    // Update display value
    sliderValue.textContent = `${size} px`;

    // Update master slider visual
    updateSliderVisual(masterSlider, size);

    // Update all card sliders and samples
    document.querySelectorAll(".card").forEach((card) => {
      const sample = card.querySelector(".card-sample");
      const slider = card.querySelector(".slider");
      const indicator = card.querySelector(".font-size-indicator");

      if (sample && slider) {
        slider.value = size;
        updateSampleSize(sample, size); // This will now check for grid view
        updateSliderVisual(slider, size);
        showSizeIndicator(indicator, size);
      }
    });
  });

  // View mode toggle
  const listViewBtn = document.getElementById("listViewBtn");
  const gridViewBtn = document.getElementById("gridViewBtn");

  listViewBtn.addEventListener("click", () => {
    if (currentState.viewMode === "list") return;
    currentState.viewMode = "list";
    fontContainer.classList.remove("grid-view");
    fontContainer.classList.add("list-view");
    updateViewButtonStates();

    // Update font sizes for list view
    document.querySelectorAll(".card-sample").forEach((sample) => {
      updateSampleSize(sample, currentState.masterFontSize);
    });
  });

  gridViewBtn.addEventListener("click", () => {
    if (currentState.viewMode === "grid") return;
    currentState.viewMode = "grid";
    fontContainer.classList.remove("list-view");
    fontContainer.classList.add("grid-view");
    updateViewButtonStates();

    // Update font sizes for grid view
    document.querySelectorAll(".card-sample").forEach((sample) => {
      updateSampleSize(sample, currentState.masterFontSize);
    });
  });

  // Text alignment buttons
  const alignmentButtons = [
    { id: "alignLeftBtn", align: "left" },
    { id: "alignCenterBtn", align: "center" },
    { id: "alignRightBtn", align: "right" },
  ];

  alignmentButtons.forEach((config) => {
    const btn = document.getElementById(config.id);
    if (btn) {
      // Don't replace the SVG images
      // Remove this line: btn.innerHTML = `<i class="material-icons">${config.icon}</i>`;
      
      // Make sure the button has the proper class
      btn.classList.add("align-btn");

      // Add click event
      btn.addEventListener("click", () => {
        const alignment = config.align;
        if (currentState.textAlign === alignment) return;

        currentState.textAlign = alignment;
        updateTextAlignment(alignment);
        updateAlignButtonStates(alignment);
      });
    }
  });

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Only handle keyboard shortcuts if no input is focused
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.contentEditable === "true"
    )
      return;

    if (e.key === "g") {
      // Toggle grid/list view
      if (currentState.viewMode === "list") {
        gridViewBtn.click();
      } else {
        listViewBtn.click();
      }
    } else if (e.key === "+" || e.key === "=") {
      // Increase font size
      const newSize = Math.min(currentState.masterFontSize + 4, 210);
      masterSlider.value = newSize;
      masterSlider.dispatchEvent(new Event("input"));
    } else if (e.key === "-" || e.key === "_") {
      // Decrease font size
      const newSize = Math.max(currentState.masterFontSize - 4, 12);
      masterSlider.value = newSize;
      masterSlider.dispatchEvent(new Event("input"));
    }
  });

  // Sort buttons event listeners - FIXED SELECTORS
  const sortButtons = {
    latest: document.getElementById(
      "latestBtn"
    ),
    popular: document.getElementById(
      "popularBtn"
    ),
    alphabetical: document.getElementById(
      "alphabetBtn"
    ),
  };

  // Initialize with default sort (alphabetical)
  updateSortButtonStates("alphabetical");

  // Add click listeners to sort buttons
  Object.entries(sortButtons).forEach(([sortMethod, button]) => {
    if (button) {
      button.addEventListener("click", async () => {
        if (currentState.sortBy === sortMethod) return;

        currentState.sortBy = sortMethod;
        updateSortButtonStates(sortMethod);

        await loadAndDisplayFonts(true);
      });
    } else {
      console.warn(`Sort button for ${sortMethod} not found`);
    }
  });
}

/**
 * Updates the visual state of the sort buttons
 * @param {string} selectedSort - The currently selected sort method
 */
function updateSortButtonStates(selectedSort) {

  const sortButtons = document.querySelectorAll(".sortBtn");

  // Clear all active states first
  sortButtons.forEach((button) => {
    button.classList.remove("active");
  });

  // Set active state based on selected sort
  let activeButton;
  if (selectedSort === "latest") {
    activeButton = sortButtons[0];
  } else if (selectedSort === "popular") {
    activeButton = sortButtons[1];
  } else {
    // alphabetical (default)
    activeButton = sortButtons[2];
  }

  if (activeButton) {
    activeButton.classList.add("active");
  }
}

function openDropdown(content, triangle, button) {
  content.classList.add("visible", "opacity-100", "border", "border-[#4F4F4F]");
  content.classList.remove("invisible", "opacity-0");
  triangle.classList.add("rotate-triangle");
  button.style.backgroundColor = "transparent";
}

function closeDropdown(content, triangle, button) {
  content.classList.remove(
    "visible",
    "opacity-100",
    "border",
    "border-[#4F4F4F]"
  );
  content.classList.add("invisible", "opacity-0");
  triangle.classList.remove("rotate-triangle");
  button.style.backgroundColor = "";
}

function displayFonts(fonts, append = false) {
  if (!Array.isArray(fonts) || fonts.length === 0) return;

  const fragment = document.createDocumentFragment();
  const successfulCards = [];

  fonts.forEach((font) => {
    try {
      const card = createFontCard(font);
      fragment.appendChild(card);
      successfulCards.push(font.family);
    } catch (error) {
      console.warn(
        `Skipping card for ${font.family || "unknown font"}:`,
        error
      );
    }
  });

  if (successfulCards.length === 0 && !append) {
    fontContainer.innerHTML =
      '<div class="text-center text-gray-400">Could not display these fonts</div>';
    return;
  }

  if (!append) {
    fontContainer.innerHTML = "";
  }
  fontContainer.appendChild(fragment);
}

function setupIntersectionObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && currentState.hasMore) {
        loadAndDisplayFonts(false);
      }
    },
    { rootMargin: "200px" }
  );

  const trigger = document.querySelector("#load-more-trigger");
  if (trigger) observer.observe(trigger);
}

function updateCategoryButtonStates(selectedCategory) {
  const radioButtons = document.querySelectorAll(
    'input[name="category-filter"]'
  );
  radioButtons.forEach((radio) => {
    if (radio.value === selectedCategory) {
      radio.checked = true;
      // Update the dropdown button text too
      const categoryName = radio.parentElement.textContent.trim();
      const categoriesButton = document.getElementById("categoriesButton");
      if (categoriesButton) {
        categoriesButton.querySelector("span:first-child").textContent =
          selectedCategory === "all" ? "Categories" : categoryName;
      }
    }
  });
}

function updateViewButtonStates() {
  const listBtn = document.getElementById("listViewBtn");
  const gridBtn = document.getElementById("gridViewBtn");

  listBtn.classList.toggle("selected", currentState.viewMode === "list");
  gridBtn.classList.toggle("selected", currentState.viewMode === "grid");
}

function updateAlignButtonStates(selectedAlign) {
  const alignmentButtons = [
    { id: "alignLeftBtn", align: "left" },
    { id: "alignCenterBtn", align: "center" },
    { id: "alignRightBtn", align: "right" },
  ];

  alignmentButtons.forEach((config) => {
    const btn = document.getElementById(config.id);
    if (btn) {
      // Remove both classes first
      btn.classList.remove("selected", "active");
      
      // Then add them if this is the selected alignment
      if (config.align === selectedAlign) {
        btn.classList.add("selected", "active");
      }
    }
  });
}

function updateTextAlignment(alignment) {
  document.querySelectorAll(".card-sample").forEach((sample) => {
    sample.style.textAlign = alignment;
  });
}

function clampSize(size) {
  return Math.min(Math.max(size, 12), 210);
}

function updateSampleSize(sampleElement, size) {
  if (!sampleElement) return;

  // Ensure size is within acceptable limits
  const clampedSize = clampSize(size);

  // Check if we're in grid view and adjust size accordingly
  const isGridView = fontContainer.classList.contains("grid-view");
  const adjustedSize = isGridView ? Math.min(60, clampedSize) : clampedSize;

  // Update font size and adjust line height proportionally
  sampleElement.style.fontSize = `${adjustedSize}px`;
  sampleElement.style.lineHeight = `${adjustedSize * 1.4}px`;
}

function updateSliderVisual(sliderElement, value, min = 12, max = 210) {
  if (!sliderElement) return;

  // Set the slider value
  sliderElement.value = value;

  // Calculate the percentage for visual styling
  const percent = ((value - min) / (max - min)) * 100;

  // Use the CSS variable instead of inline style
  sliderElement.style.setProperty("--split-percent", `${percent}%`);
}

function showSizeIndicator(indicatorElement, size) {
  if (!indicatorElement) return;

  // Update the text content with the current size
  indicatorElement.textContent = `${size}px`;

  // Make the indicator visible
  indicatorElement.style.opacity = "1";

  // Hide the indicator after a delay
  clearTimeout(indicatorElement.timeout);
  indicatorElement.timeout = setTimeout(() => {
    indicatorElement.style.opacity = "0";
  }, 1500);
}

function showLoading(show) {
  if (!loadingIndicator) return;

  if (show) {
    loadingIndicator.classList.remove("hidden");
  } else {
    loadingIndicator.classList.add("hidden");
  }
}
