// scripts.js

import { GoogleFontsLoader } from "./modules/google-fonts-loader.js";

// Simplify constants
const fontContainer = document.getElementById("font-container");
const searchInput = document.querySelector('input[placeholder="Search"]');
const masterSlider = document.querySelector(".master-slider");
const sliderValue = document.getElementById("sliderValue");
const loadingIndicator = document.getElementById("loading-indicator");
let isUpdating = false;

let currentState = {
  category: "all",
  personality: "all", // Add personality filter to state
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

// Create a filter manager to coordinate category and personality filters
const filterManager = {
  // Store available data
  availablePersonalitiesByCategory: {}, // Will be populated dynamically
  allPersonalities: [],
  // New property to store personality data
  personalityData: null,
  
  // Initialize the filter manager
  async init() {
    try {
      // Load all available personalities
      this.allPersonalities = await googleFontsLoader.getPersonalities();
      
      // Load personality data once
      const response = await fetch('/data/personality.json');
      this.personalityData = await response.json();
      
      // Store available personalities for each category
      const categories = ['all', 'serif', 'sans-serif', 'display', 'handwriting', 'monospace'];
      
      for (const category of categories) {
        // For 'all' category, all personalities are available
        if (category === 'all') {
          this.availablePersonalitiesByCategory[category] = [...this.allPersonalities];
          continue;
        }
        
        // For specific categories, we need to determine which personalities contain fonts of this category
        // This requires analyzing the personality.json and checking each font's category
        const personalitiesForCategory = [];
        
        for (const personality of this.allPersonalities) {
          // Check if this personality contains any fonts of the specified category
          const hasMatchingFonts = await this.personalityHasFontsInCategory(personality, category);
          if (hasMatchingFonts) {
            personalitiesForCategory.push(personality);
          }
        }
        
        this.availablePersonalitiesByCategory[category] = personalitiesForCategory;
      }
    } catch (error) {
      console.error("Error initializing filter manager:", error);
    }
  },
  
  // Check if a personality contains any fonts of a specific category
  async personalityHasFontsInCategory(personality, category) {
    try {
      // First, check our cache to avoid repeated lookups
      if (!this._fontsInPersonalityCache) {
        this._fontsInPersonalityCache = {};
      }
      
      // Create cache key
      const cacheKey = `${personality}_${category}`;
      
      // Return from cache if available
      if (this._fontsInPersonalityCache[cacheKey] !== undefined) {
        return this._fontsInPersonalityCache[cacheKey];
      }
      
      // FIX: Properly normalize category name - replace all underscores, not just the first one
      // sans_serif becomes sans-serif
      const normalizedCategory = category.replace(/_/g, '-').toLowerCase();
      
      // Use cached personality data instead of fetching again
      const personalityEntries = this.personalityData[personality] || [];
      const fontNames = personalityEntries.map(entry => entry.font).filter(Boolean);
      
      // Check if any of these fonts belong to the specified category
      const matchingFonts = [];
      const result = fontNames.some(fontName => {
        const font = googleFontsLoader.fonts.find(f => 
          (f.family || f.name) === fontName
        );
        const isMatch = font && font.category && 
                       font.category.toLowerCase() === normalizedCategory;
        if (isMatch) {
          matchingFonts.push(fontName);
        }
        return isMatch;
      });
      
      // Cache the result
      this._fontsInPersonalityCache[cacheKey] = result;
      
      return result;
    } catch (error) {
      console.error(`Error checking if personality ${personality} has fonts in category ${category}:`, error);
      return false;
    }
  },
  
  // Update the personality dropdown based on category
  updatePersonalityDropdown(selectedCategory) {
    const dropdownContent = document.getElementById('personalityDropdownContent');
    if (!dropdownContent) return;
    
    // Save current selection if possible
    const currentPersonality = currentState.personality;
    
    // Get available personalities for this category
    const availablePersonalities = this.availablePersonalitiesByCategory[selectedCategory] || [];
    
    // Keep the "All" option and clear any other options
    const allOption = dropdownContent.querySelector('label:first-child');
    if (!allOption) return;
    
    dropdownContent.innerHTML = '';
    dropdownContent.appendChild(allOption);
    
    // Create a wrapper for the grid layout
    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'personality-grid';
    dropdownContent.appendChild(gridWrapper);
    
    // Add each available personality as a radio option
    availablePersonalities.forEach(personality => {
      if (!personality) return;
      
      const label = document.createElement('label');
      label.className = 'block px-4 py-2 text-sm personality-item';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'personality-filter';
      input.value = personality;
      
      // Check if this was previously selected (only for 'all' category)
      if (selectedCategory === 'all' && personality === currentPersonality) {
        input.checked = true;
      }
      
      // IMPORTANT: First add label click handler to stop propagation
      label.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + personality));
      
      // Then add input change handler
      input.addEventListener("change", async (e) => {
        e.stopPropagation();
        
        const personality = e.target.value;
        if (currentState.personality === personality) return;

        // Update state
        currentState.personality = personality;
        currentState.page = 0; // Reset pagination

        // Update button text with selected personality name
        const personalityButton = document.getElementById("personalityButton");
        const personalityName = e.target.parentElement.textContent.trim();
        personalityButton.querySelector("span:first-child").textContent =
          personality === "all" ? "Personality" : personalityName;

        // Apply filters without closing dropdown
        await this.applyFilters();
      });
      
      // Add to grid wrapper instead of directly to dropdownContent
      gridWrapper.appendChild(label);
    });
    
    // Reset personality to "All" unless we're keeping the current selection
    if (selectedCategory !== 'all' || !availablePersonalities.includes(currentPersonality)) {
      const allRadio = dropdownContent.querySelector('input[value="all"]');
      if (allRadio) allRadio.checked = true;
      currentState.personality = 'all';
      
      // Update the button text
      const personalityButton = document.getElementById("personalityButton");
      if (personalityButton) {
        personalityButton.querySelector("span:first-child").textContent = "Personality";
      }
    }
  },
  
  // Apply both filters and update font display
  async applyFilters() {
    // Reset to first page
    currentState.page = 0;
    
    // Load and display fonts with current filters
    await loadAndDisplayFonts(true);
  }
};

// Track visible cards for performance optimization
const visibleCards = new Set();

// Event Listeners
document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  try {
    showLoading(true);

    // Initialize the Google Fonts loader with the fonts.json file
    googleFontsLoader = await GoogleFontsLoader.fromJson("/data/fontinfo.json");

    // Initialize the filter manager
    await filterManager.init();

    // Set initial view mode class
    fontContainer.classList.add(`${currentState.viewMode}-view`);
    updateViewButtonStates();

    // Make sure left alignment is the default
    currentState.textAlign = "left";
    updateAlignButtonStates(currentState.textAlign);
    
    // Populate the personality dropdown menu initially with all personalities
    await populatePersonalityDropdown();

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

/**
 * Dynamically populates the personality dropdown with personalities from the JSON file
 */
async function populatePersonalityDropdown() {
  try {
    // Get the dropdown content container
    const dropdownContent = document.getElementById('personalityDropdownContent');
    if (!dropdownContent) return;
    
    // Keep the "All" option and clear any other hardcoded options
    const allOption = dropdownContent.querySelector('label');
    dropdownContent.innerHTML = '';
    dropdownContent.appendChild(allOption);
    
    // Create a wrapper for the grid layout
    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'personality-grid';
    dropdownContent.appendChild(gridWrapper);
    
    // Get personalities for current category from filter manager
    const personalities = filterManager.availablePersonalitiesByCategory[currentState.category] || 
                        filterManager.allPersonalities;
    
    // Add each personality as a radio option
    personalities.forEach(personality => {
      // Skip empty personalities
      if (!personality) return;
      
      const label = document.createElement('label');
      label.className = 'block px-4 py-2 text-sm personality-item';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'personality-filter';
      input.value = personality;
      
      // Stop propagation on both click and change events
      label.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      input.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + personality));
      
      // Add to grid wrapper instead of directly to dropdownContent
      gridWrapper.appendChild(label);
    });
  } catch (error) {
    console.error('Error populating personality dropdown:', error);
  }
}

async function loadAndDisplayFonts(reset = false) {
  if (isUpdating) return;
  isUpdating = true;

  if (reset) {
    currentState.page = 0;
    fontContainer.innerHTML = "";
  }
  
  // Always show loading before any operations
  showLoading(true);

  try {
    // Get fonts based on current filters
    const pageSize = 20; // Number of fonts to load per batch
    const skip = currentState.page * pageSize;
    let result;

    // Check if we're filtering by personality
    if (currentState.personality !== "all") {
      // MODIFIED: When combining personality + category filter, load ALL fonts for pagination
      const loadAllFonts = currentState.category !== "all";
      const pageToUse = loadAllFonts ? 0 : currentState.page;
      const pageSizeToUse = loadAllFonts ? 1000 : pageSize; // Large number to get all fonts
      
      // Load fonts from personality data based on personality
      result = await googleFontsLoader.loadFontsByPersonality(
        currentState.personality,
        pageToUse,
        pageSizeToUse
      );
      
      // Fix: Enrich fonts with missing category data by looking up in googleFontsLoader.fonts
      result.fonts = result.fonts.map(font => {
        const fontName = font.family || font.name;
        if (!font.category) {
          const fullFontData = googleFontsLoader.getFont(fontName);
          if (fullFontData) {
            return { ...font, category: fullFontData.category };
          }
        }
        return font;
      });
      
      // Apply category filter if needed
      if (currentState.category !== "all") {
        // FIX: Convert underscores to hyphens consistently
        const categoryFilter = currentState.category.replace(/_/g, '-').toLowerCase();
        const beforeFilter = result.fonts.length;

        result.fonts = result.fonts.filter(font => {
          const fontCategory = (font.category || "").toLowerCase();
          return fontCategory === categoryFilter;
        });
        
        // NEW: Apply pagination manually after filtering
        const totalFilteredFonts = result.fonts.length;
        if (loadAllFonts) {
          result.fonts = result.fonts.slice(skip, skip + pageSize);
        }
        
        result.totalFonts = totalFilteredFonts;
        result.hasMore = skip + pageSize < totalFilteredFonts;
      }
    } else {
      // Use regular sorting with category filter from GoogleFontsLoader
      const sortedFonts = googleFontsLoader.getSortedFonts(
        currentState.sortBy,
        currentState.category,
        currentState.searchTerm
      );

      const totalFonts = sortedFonts.length;
      const fonts = sortedFonts.slice(skip, skip + pageSize);

      result = {
        fonts: fonts,
        totalFonts: totalFonts,
        hasMore: skip + pageSize < totalFonts,
      };
    }

    // Update total count regardless of whether fonts were found
    currentState.totalFonts = result.totalFonts;
    const totalEntry = document.querySelector(".total-entry");
    if (totalEntry) {
      totalEntry.textContent = `${result.totalFonts} Total`;
    }

    // Continue with the rest of the function as before
    if (result.fonts.length > 0) {
      // Pre-load the fonts we're about to display
      const fontNames = result.fonts.map((font) => font.name);
      await googleFontsLoader.loadFonts(fontNames);

      // Use a try-catch here to handle errors in individual font cards
      try {
        // Display fonts but don't hide loading yet
        displayFonts(result.fonts, !reset);
        
        // Give the DOM time to render and the browser to paint before hiding loading indicator
        setTimeout(() => {
          isUpdating = false;
          showLoading(false);
        }, 300);
        
        currentState.hasMore = result.hasMore;
        currentState.page++;
      } catch (displayError) {
        console.warn("Error displaying some fonts:", displayError);
        isUpdating = false;
        showLoading(false);
      }
    } else if (reset) {
      fontContainer.innerHTML =
        '<div class="text-center text-gray-400">No fonts found</div>';
      currentState.hasMore = false;
      isUpdating = false;
      showLoading(false);
    }
  } catch (error) {
    console.error("Error loading fonts:", error);
    // Display a user-friendly error message
    if (reset) {
      fontContainer.innerHTML =
        '<div class="text-center text-red-400">Could not load fonts. Please try again later.</div>';
    }
    isUpdating = false;
    showLoading(false);
  }
  
  // Remove the finally block since we're handling showLoading(false) in each case
}

function createFontCard(fontData) {
  // Just add the basic card class - all other styling comes from CSS
  const card = document.createElement("div");
  card.classList.add("card");

  // Fix variable font detection logic

  // Get the font designer - fallback to 'Unknown' if not available
  const designer = fontData.designer || "Unknown";

  // Get font name
  const fontName = fontData.family || fontData.name;

  const isVariable = googleFontsLoader.isVariableFont(fontName);

  // Use the same method as layout.js to get variants count
  const variants = googleFontsLoader.getFontVariants(fontName);
  const stylesCount = variants.length;

  // Add "Variable" indicator for variable fonts
  const variableBadge = isVariable
    ? '<span class="variable-badge">Variable</span>'
    : "";

  const weightSliderHTML = isVariable
    ? `<div class="slider-container">
     <span class="slider-title">Weight</span>
     <input type="range" min="100" max="900" step="5" value="400" class="slider" data-slider-type="weight">
   </div>`
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
    ${weightSliderHTML}
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
               style="font-family: '${fontName}', sans-serif; font-weight: 400;">
                ${fontName}
            </p>
        </div>
        
        <div class="card-footer">
            <div>
                <p>Designed by ${designer}</p>
            </div>
            <a href="glyph.html?font=${encodeURIComponent(fontName)}" class="view-family-btn">View family</a>
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
  const variantDropdown = card.querySelector(".variantDropdown");
  const sizeTitleElement = sizeSlider.parentNode.querySelector(".slider-title");

  // Get the font name from fontData
  const fontName = fontData.family || fontData.name;

  // Add this code to setupCardInteractions function after getting fontName
  const isVariableFont = googleFontsLoader.isVariableFont(fontName);

  // Create default weight settings
  if (weightSlider) {
      const weightTitleElement =
        weightSlider.parentNode.querySelector(".slider-title");
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
  }
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

  // Category radio buttons - UPDATED to use filter manager
  const categoryRadios = document.querySelectorAll(
    'input[name="category-filter"]'
  );
  
  // Add click event handlers to all category labels
  document.querySelectorAll('#dropdownContent label').forEach(label => {
    label.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
  
  categoryRadios.forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      // Stop propagation to prevent dropdown from closing
      e.stopPropagation();
      
      const category = e.target.value;
      if (currentState.category === category) return;

      // Update state
      currentState.category = category;
      currentState.searchTerm = "";

      // Update button text with selected category name
      const categoriesButton = document.getElementById("categoriesButton");
      const categoryName = e.target.parentElement.textContent.trim();
      categoriesButton.querySelector("span:first-child").textContent =
        category === "all" ? "Categories" : categoryName;

      // Update personality dropdown based on selected category
      filterManager.updatePersonalityDropdown(category);
      
      // Apply both filters
      await filterManager.applyFilters();
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

  // Add back the simple master slider handler
  masterSlider.addEventListener("input", (e) => {
    const size = parseInt(e.target.value);
    currentState.masterFontSize = size;

    // Update display value
    sliderValue.textContent = `${size} px`;

    // Update master slider visual
    updateSliderVisual(masterSlider, size);

    // Only update visible cards while dragging for better performance
    visibleCards.forEach(cardElement => {
      const sample = cardElement.querySelector(".card-sample");
      const slider = cardElement.querySelector(".slider");

      if (sample && slider) {
        slider.value = size;
        updateSampleSize(sample, size);
        updateSliderVisual(slider, size);
      }
    });
  });

  // When slider is released, update all remaining cards
  masterSlider.addEventListener("change", (e) => {
    const size = parseInt(e.target.value);
    
    // Get all cards that weren't updated during dragging
    const allCards = Array.from(document.querySelectorAll(".card"));
    const invisibleCards = allCards.filter(card => !visibleCards.has(card));
    
    // Update the invisible cards
    invisibleCards.forEach(card => {
      const sample = card.querySelector(".card-sample");
      const slider = card.querySelector(".slider");
      
      if (sample && slider) {
        slider.value = size;
        updateSampleSize(sample, size);
        updateSliderVisual(slider, size);
      }
    });
  });

  // Set up visibility tracking for cards
  setupCardVisibilityTracking();

  // View mode toggle
  const listViewBtn = document.getElementById("listViewBtn");
  const gridViewBtn = document.getElementById("gridViewBtn");

  listViewBtn.addEventListener("click", () => {
    if (currentState.viewMode === "list") return;
    currentState.viewMode = "list";
    fontContainer.classList.remove("grid-view");
    fontContainer.classList.add("list-view");
    updateViewButtonStates();
    // Update font sizes for grid view
    document.querySelectorAll(".card-sample").forEach((sample) => {
      updateSampleSize(sample, 96);
    });

    // Update master slider visual AND the label
    updateSliderVisual(masterSlider, 96);
    sliderValue.textContent = "96 px";
    currentState.masterFontSize = 96;

    // Reset visibility tracking after view mode change
    setTimeout(setupCardVisibilityTracking, 100);
  });

  gridViewBtn.addEventListener("click", () => {
    if (currentState.viewMode === "grid") return;
    currentState.viewMode = "grid";
    fontContainer.classList.remove("list-view");
    fontContainer.classList.add("grid-view");
    updateViewButtonStates();

    // Update font sizes for grid view
    document.querySelectorAll(".card-sample").forEach((sample) => {
      updateSampleSize(sample, 60);
    });
    
    // Update master slider visual AND the label
    updateSliderVisual(masterSlider, 60);
    sliderValue.textContent = "60 px";
    currentState.masterFontSize = 60;

    // Reset visibility tracking after view mode change
    setTimeout(setupCardVisibilityTracking, 100);
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
    latest: document.getElementById("latestBtn"),
    popular: document.getElementById("popularBtn"),
    alphabetical: document.getElementById("alphabetBtn"),
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

  // Personality dropdown
  const personalityButton = document.getElementById("personalityButton");
  const personalityContent = document.getElementById("personalityContent");
  const personalityTriangle = document.getElementById("personalityTriangle");

  // Toggle personality dropdown
  personalityButton.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent immediate closing
    const isExpanded = personalityContent.classList.contains("visible");

    if (isExpanded) {
      closeDropdown(personalityContent, personalityTriangle, personalityButton);
    } else {
      openDropdown(personalityContent, personalityTriangle, personalityButton);
    }
  });

  // Close personality dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !personalityButton.contains(e.target) &&
      !personalityContent.contains(e.target)
    ) {
      closeDropdown(personalityContent, personalityTriangle, personalityButton);
    }
  });

  // Personality radio buttons - UPDATED to use filter manager
  const personalityRadios = document.querySelectorAll(
    'input[name="personality-filter"]'
  );
  
  // Add click event handlers to all personality labels
  document.querySelectorAll('#personalityContent label').forEach(label => {
    label.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
  
  personalityRadios.forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      // Stop propagation to prevent dropdown from closing
      e.stopPropagation();
      
      const personality = e.target.value;
      if (currentState.personality === personality) return;

      // Update state
      currentState.personality = personality;
      currentState.page = 0; // Reset pagination

      // Update button text with selected personality name
      const personalityButton = document.getElementById("personalityButton");
      const personalityName = e.target.parentElement.textContent.trim();
      personalityButton.querySelector("span:first-child").textContent =
        personality === "all" ? "Personality" : personalityName;

      // Apply both filters without closing dropdown
      await filterManager.applyFilters();
    });
  });

  // When searching, reset both category and personality filters
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
      // Reset filters when searching
      currentState.category = "all";
      currentState.personality = "all";
      currentState.searchTerm = searchTerm;
      
      // Update UI
      updateCategoryButtonStates("all");
      updatePersonalityButtonStates("all");
      
      // Update personality dropdown for 'all' category
      filterManager.updatePersonalityDropdown('all');

      await loadAndDisplayFonts(true);
    }, 300);
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
  
  // Special handling for personality dropdown
  if (content.id === "personalityContent") {
    // First add the right positioning class
    content.classList.add("wide-dropdown");
    
    // Remove animation class first to reset animation
    content.classList.remove("personality-dropdown-animate");
    
    // Force browser reflow to ensure animation restart
    void content.offsetWidth;
    
    // Now add the animation class (this will control width through the animation)
    content.classList.add("personality-dropdown-animate");
    
    // Clear any inline styles that might interfere
    content.style.width = "";
  }
  // Special handling for category dropdown
  else if (content.id === "dropdownContent") {
    // Remove animation class first to reset animation
    content.classList.remove("category-dropdown-animate");
    
    // Force browser reflow to ensure animation restart
    void content.offsetWidth;
    
    // Add animation class
    content.classList.add("category-dropdown-animate");
  }
}

function closeDropdown(content, triangle, button) {
  // Handle animation cleanup
  if (content.id === "personalityContent") {
    content.classList.remove("personality-dropdown-animate");
  }
  else if (content.id === "dropdownContent") {
    content.classList.remove("category-dropdown-animate");
  }
  
  content.classList.remove(
    "visible",
    "opacity-100",
    "border",
    "border-[#4F4F4F]"
  );
  content.classList.add("invisible", "opacity-0");
  triangle.classList.remove("rotate-triangle");
  button.style.backgroundColor = "";
  
  // Reset width class with delay for personality dropdown
  if (content.id === "personalityContent") {
    setTimeout(() => {
      content.classList.remove("wide-dropdown");
    }, 300);
  }
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

  // Update visibility tracking when new fonts are added
  // Short delay to ensure DOM is updated
  setTimeout(setupCardVisibilityTracking, 100);
}

function setupIntersectionObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && currentState.hasMore && !isUpdating) {
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

/**
 * Updates the visual state of the personality dropdown button and radios
 * @param {string} selectedPersonality - The currently selected personality
 */
function updatePersonalityButtonStates(selectedPersonality) {
  const radioButtons = document.querySelectorAll(
    'input[name="personality-filter"]'
  );
  radioButtons.forEach((radio) => {
    if (radio.value === selectedPersonality) {
      radio.checked = true;
      
      // Update the dropdown button text
      const personalityName = radio.parentElement.textContent.trim();
      const personalityButton = document.getElementById("personalityButton");
      if (personalityButton) {
        personalityButton.querySelector("span:first-child").textContent =
          selectedPersonality === "all" ? "Personality" : personalityName;
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
  const adjustedSize = isGridView ? Math.min(210, clampedSize) : clampedSize;

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

function showLoading(show) {
  console.log("showLoading called with:", show);
  
  // Load exotic fonts for the loading animation
  if (!window.lokiLoadingFontsLoaded) {
    // Pre-load exotic fonts for the animation
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Creepster&family=Pirata+One&family=Cinzel+Decorative&family=Almendra+Display&family=Bungee+Outline&family=Faster+One&family=Ewert&family=Henny+Penny&family=MedievalSharp&family=Metal+Mania&family=Monoton&family=Rubik+Glitch&family=Nosifer&display=swap';
    document.head.appendChild(fontLink);
    window.lokiLoadingFontsLoaded = true;
  }
  
  // Get or create the Loki-inspired font-cycling animation
  let textLoader = document.querySelector('.loki-loader');
  
  if (!textLoader && show) {
    console.log("Creating new Loki-inspired font cycling loader");
    
    // Create the loader container
    textLoader = document.createElement('div');
    textLoader.className = 'loki-container loki-loader';
    
    // Create the LOADING text with each letter in its own element
    const loadingText = "LOADING";
    for (let i = 0; i < loadingText.length; i++) {
      const letter = document.createElement('div');
      letter.className = 'loki-letter';
      letter.textContent = loadingText[i];
      
      // Add each letter to the loader
      textLoader.appendChild(letter);
    }
    
    // Add to the document body
    document.body.appendChild(textLoader);
    console.log("Loki-inspired font cycling loader added to DOM:", textLoader);
  } else {
    console.log("Existing loader found:", textLoader);
  }

  if (show) {
    console.log("Showing loader");
    if (loadingIndicator) loadingIndicator.classList.remove("hidden");
    if (textLoader) {
      // Remove any pending hide timeouts
      if (textLoader._hideTimeout) {
        clearTimeout(textLoader._hideTimeout);
        textLoader._hideTimeout = null;
      }
      textLoader.classList.remove("hidden");
      textLoader.style.opacity = "1";
      textLoader.style.display = "flex";
    }
  } else {
    console.log("Hiding loader");
    if (loadingIndicator) loadingIndicator.classList.add("hidden");
    if (textLoader) {
      // Immediately hide the loader without transition or timeout
      textLoader.classList.add("hidden");
      textLoader.style.opacity = "0";
      textLoader.style.display = "none";
    }
  }
}

/**
 * Sets up intersection observer to track which cards are visible
 */
function setupCardVisibilityTracking() {
  // Clear the set
  visibleCards.clear();

  // Create intersection observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Card is visible
        visibleCards.add(entry.target);
      } else {
        // Card is no longer visible
        visibleCards.delete(entry.target);
      }
    });
  }, {
    // Consider partially visible elements as "visible"
    rootMargin: '100px',
    threshold: 0.1
  });

  // Observe all cards
  document.querySelectorAll('.card').forEach(card => {
    observer.observe(card);
  });
}
