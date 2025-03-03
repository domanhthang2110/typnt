/**
 * Google Fonts Loader Module
 * Handles loading and managing Google fonts with WebFont.js
 */

// Constants
export const FONTS_PER_PAGE = 20;

export class GoogleFontsLoader {
  constructor() {
    this.fontsData = [];
    this.currentPage = 0;
    this.loadedFonts = new Set();
    this.categoryIndices = new Map(); // Track position for each category
    this.lastFilterIndex = 0; // Add this to track position in filtered search
    this.variableFonts = new Map(); // Track variable font data with weight ranges
  }

  /**
   * Normalize variant strings to WebFont format
   * @param {string} variant - Font variant (e.g., 'regular', 'italic', '500', '500italic')
   * @returns {string} Normalized variant (e.g., '400', '400italic', '500', '500italic')
   */
  normalizeVariant(variant) {
    if (variant === "regular") return "400";
    if (variant === "italic") return "400italic";
    return variant;
  }

  // Add this new method
  getFonts() {
    return this.fontsData;
  }

  /**
   * Check if font is variable based on metadata
   * @param {Object} font - Font data object
   * @returns {boolean} True if font is variable
   */
  isVariableFont(font) {
    if (!font) return false;
    
    // Special case for Epilogue which we know is variable
    if (font.family === "Epilogue") return true;
    
    // First check our cache
    if (this.variableFonts.has(font.family)) {
      return true;
    }

    // Check for axes data which indicates variable font
    if (font.axes && font.axes.includes("wght")) {
      return true;
    }

    // Check for variant ranges (e.g., "100..900")
    if (font.variants && font.variants.some((v) => v.includes(".."))) {
      return true;
    }
    
    // If the font has a large number of weight variants, it's likely variable
    if (font.variants && font.variants.length >= 7) {
      const weights = font.variants
        .map(v => parseInt(v.replace('italic', '').replace('regular', '400')))
        .filter(w => !isNaN(w));
      
      if (weights.length >= 7) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get weight range for a font
   * @param {Object} font - Font data object
   * @returns {Object} Object with min and max weight
   */
  getWeightRange(font) {
    if (!font) return { min: 400, max: 400 };
    
    // Special case for Epilogue
    if (font.family === "Epilogue") {
      return { min: 100, max: 900 };
    }
    
    // Check cache first
    if (this.variableFonts.has(font.family)) {
      return this.variableFonts.get(font.family);
    }

    // Default range
    let range = { min: 400, max: 400 };

    // Try to extract from variants
    if (font.variants) {
      // Check for explicit range notation (e.g. "100..900")
      const rangeVariant = font.variants.find((v) => v.includes(".."));
      if (rangeVariant) {
        const [minStr, maxStr] = rangeVariant.split("..");
        const min = parseInt(minStr);
        const max = parseInt(maxStr);
        if (!isNaN(min) && !isNaN(max)) {
          range = { min, max };
        }
      } else {
        // Extract from individual weights
        const weights = font.variants
          .map((v) =>
            parseInt(v.replace("italic", "").replace("regular", "400"))
          )
          .filter((w) => !isNaN(w));

        if (weights.length > 0) {
          range = {
            min: Math.min(...weights),
            max: Math.max(...weights),
          };
        }
      }
    }

    // Store in cache
    if (this.isVariableFont(font)) {
      this.variableFonts.set(font.family, range);
    }

    return range;
  }

  async getFontsByCategory(category, page = 0) {
    const startIndex = page * FONTS_PER_PAGE;
    let filteredFonts;

    // Filter fonts by category
    filteredFonts = this.fontsData.filter(
      (font) => font.category?.toLowerCase() === category.toLowerCase()
    );

    const paginatedFonts = filteredFonts.slice(
      startIndex,
      startIndex + FONTS_PER_PAGE
    );

    // Load the fonts if needed
    await this.loadFonts(paginatedFonts);

    return {
      fonts: paginatedFonts,
      hasMore: startIndex + FONTS_PER_PAGE < filteredFonts.length,
      totalFonts: filteredFonts.length,
      currentPage: page,
    };
  }

  async getFontInfoBatch(page = 0, itemsPerPage = FONTS_PER_PAGE) {
    const startIndex = page * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const batch = this.fontsData.slice(startIndex, endIndex);

    // Load fonts if needed
    await this.loadFonts(batch);

    return {
      fonts: batch,
      hasMore: endIndex < this.fontsData.length,
      totalFonts: this.fontsData.length,
      currentPage: page,
    };
  }

  // Updated helper method to handle font loading with variable fonts
  async loadFonts(fontsToLoad) {
    // Separate variable and standard fonts
    const variableFonts = [];
    const standardFonts = [];

    for (const font of fontsToLoad) {
      if (this.loadedFonts.has(font.family)) {
        continue; // Skip already loaded fonts
      }

      if (this.isVariableFont(font)) {
        variableFonts.push(font);
      } else {
        standardFonts.push(font);
      }
    }

    // Load standard fonts using WebFont.load
    if (standardFonts.length > 0) {
      const families = standardFonts.map((font) => {
        const weights = font.variants
          .map((v) => this.normalizeVariant(v))
          .join(",");
        return `${font.family}:${weights}`;
      });

      await new Promise((resolve) => {
        WebFont.load({
          google: { families },
          active: () => {
            standardFonts.forEach((font) => this.loadedFonts.add(font.family));
            resolve();
          },
          inactive: resolve, // Don't block on failure
        });
      });
    }

    // Load variable fonts
    if (variableFonts.length > 0) {
      await Promise.all(
        variableFonts.map((font) => this.loadVariableFont(font))
      );
    }
  }

  /**
   * Load a variable font
   * @param {Object} font - Font data object
   * @returns {Promise} Resolves when font is loaded
   */
  async loadVariableFont(font) {
    if (this.loadedFonts.has(font.family)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Get weight range
      const range = this.getWeightRange(font);

      // Create style element for @import
      const style = document.createElement("style");
      const fontFamily = font.family.replace(/ /g, "+");

      // Check if font has italic variant
      const hasItalic = font.variants.some((v) => v.includes("italic"));
      let importRule;

      // Create import rule with correct format
      if (hasItalic) {
        importRule = `@import url('https://fonts.googleapis.com/css2?family=${fontFamily}:ital,wght@0,${range.min}..${range.max};1,${range.min}..${range.max}&display=swap');`;
      } else {
        importRule = `@import url('https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${range.min}..${range.max}&display=swap');`;
      }

      style.textContent = importRule;
      document.head.appendChild(style);

      // Use FontFaceObserver for more reliable font loading detection
      const observer = new FontFaceObserver(font.family);
      observer
        .load("BESbswy", 5000) // 5 second timeout
        .then(() => {
          this.loadedFonts.add(font.family);
          resolve();
        })
        .catch(() => {
          // Even if it fails, mark as loaded to avoid repeated attempts
          console.warn(`Failed to load variable font: ${font.family}`);
          this.loadedFonts.add(font.family);
          resolve();
        });
    });
  }

  /**
   * Initialize the fonts loader
   * @param {string} jsonPath - Path to the fonts.json file
   */
  async init(jsonPath = "/fonts.json") {
    try {
      const response = await fetch(jsonPath);
      const data = await response.json();
      this.fontsData = data.items || [];

      // Pre-process fonts to identify variable fonts
      for (const font of this.fontsData) {
        if (this.isVariableFont(font)) {
          // Cache the weight range for faster access later
          this.variableFonts.set(font.family, this.getWeightRange(font));
        }
      }

      return this.fontsData;
    } catch (error) {
      console.error("Failed to initialize Google Fonts loader:", error);
      throw error;
    }
  }

  /**
   * Get font information for a specific font family
   * @param {string} fontFamily - Name of the font family
   */
  getFontInfo(fontFamily) {
    const fontData = this.fontsData.find((font) => font.family === fontFamily);
    if (!fontData) return null;

    const isVariable = this.isVariableFont(fontData);
    let weightRange;
    let weights;

    if (isVariable) {
      // Get range for variable font
      weightRange = this.getWeightRange(fontData);

      // For variable fonts, create virtual instances at common weights within range
      weights = [100, 200, 300, 400, 500, 600, 700, 800, 900].filter(
        (w) => w >= weightRange.min && w <= weightRange.max
      );
    } else {
      // For standard fonts, use discrete weights
      weights = [
        ...new Set(
          fontData.variants
            .map((variant) =>
              parseInt(variant.replace("italic", "").replace("regular", "400"))
            )
            .filter((weight) => !isNaN(weight))
        ),
      ].sort((a, b) => a - b);

      weightRange = {
        min: weights[0] || 400,
        max: weights[weights.length - 1] || 400,
      };
    }

    return {
      name: fontData.family,
      source: fontData.files?.regular || fontData.files?.[400] || fontData.menu,
      style: "Regular",
      features: [], // Google Fonts don't expose OpenType features
      isVariable: isVariable,
      axes: {
        wght: {
          name: "Weight",
          default: 400,
          min: weightRange.min,
          max: weightRange.max,
        },
      },
      instances: weights.map((weight) => ({
        name: {
          en: weight === 400 ? "Regular" : this.translateWeightToName(weight),
        },
        coordinates: { wght: weight },
      })),
      variants: fontData.variants,
      files: fontData.files,
    };
  }

  /**
   * Translate numerical weight to name
   * @param {string|number} weight - Font weight
   */
  translateWeightToName(weight) {
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

    weight = weight.toString();
    if (weight === "regular") return "Regular";
    if (weight === "italic") return "Italic";

    const numWeight = parseInt(weight.replace("italic", ""));
    const isItalic = weight.includes("italic");
    const baseName = weightNames[numWeight] || weight;

    return isItalic ? `${baseName} Italic` : baseName;
  }

  async searchFonts(query, page = 0) {
    const startIndex = page * FONTS_PER_PAGE;
    const queryLower = query.toLowerCase();

    // Filter fonts that contain the search query
    const searchResults = this.fontsData.filter((font) =>
      font.family.toLowerCase().includes(queryLower)
    );

    // Sort results: exact match first, starts with second, contains third
    searchResults.sort((a, b) => {
      const aLower = a.family.toLowerCase();
      const bLower = b.family.toLowerCase();

      // Exact match gets highest priority
      if (aLower === queryLower) return -1;
      if (bLower === queryLower) return 1;

      // Starts with gets second priority
      const aStarts = aLower.startsWith(queryLower);
      const bStarts = bLower.startsWith(queryLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Default to alphabetical order
      return aLower.localeCompare(bLower);
    });

    const paginatedResults = searchResults.slice(
      startIndex,
      startIndex + FONTS_PER_PAGE
    );
    await this.loadFonts(paginatedResults);

    return {
      fonts: paginatedResults,
      hasMore: startIndex + FONTS_PER_PAGE < searchResults.length,
      totalFonts: searchResults.length,
      currentPage: page,
    };
  }

  async loadSingleFont(fontFamily) {
    if (this.loadedFonts.has(fontFamily)) {
      return Promise.resolve();
    }

    // Find the font data
    const fontData = this.fontsData.find((font) => font.family === fontFamily);
    if (!fontData) {
      return Promise.reject(new Error(`Font data not found for ${fontFamily}`));
    }

    // Check if it's a variable font
    if (this.isVariableFont(fontData)) {
      return this.loadVariableFont(fontData);
    }

    // Standard font loading
    return new Promise((resolve, reject) => {
      WebFont.load({
        google: {
          families: [fontFamily],
        },
        active: () => {
          this.loadedFonts.add(fontFamily);
          resolve();
        },
        inactive: () => {
          reject(new Error(`Failed to load font: ${fontFamily}`));
        },
        timeout: 2000, // 2 seconds timeout
      });
    });
  }
}

export const googleFontsLoader = new GoogleFontsLoader();
