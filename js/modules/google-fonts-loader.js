import { getAxisName, getAxisDefaultValue } from "./font-axis-utils.js";  // Import the utility
/**
 * Google Fonts Loader Module - Simplified
 *
 * Direct implementation for loading Google fonts with minimal complexity
 */

export class GoogleFontsLoader {
  /**
   * Creates a new GoogleFontsLoader instance
   * @param {Object[]} fontData - Array of font information objects from fontinfo.json
   */
  constructor(fontData) {
    this.fonts = fontData || [];
    this.loadedFonts = new Set();
    this.baseUrl = "https://fonts.googleapis.com/css2";
    this.fontLinkElements = new Map(); // Track font link elements by fontName
  }

  /**
   * Loads font data from the provided JSON path
   * @param {string} jsonPath - Path to the fontinfo.json file
   * @returns {Promise<GoogleFontsLoader>} - The loader instance with loaded font data
   */
  static async fromJson(jsonPath = "/data/fontinfo.json") {
    try {
      const response = await fetch(jsonPath);
      if (!response.ok)
        throw new Error(`Failed to load font data: ${response.status}`);
      const fontData = await response.json();
      return new GoogleFontsLoader(fontData);
    } catch (error) {
      console.error("Error loading font data:", error);
      return new GoogleFontsLoader([]);
    }
  }

  /**
   * Gets a font by name
   * @param {string} fontName - The name of the font to retrieve
   * @returns {Object|null} - The font object or null if not found
   */
  getFont(fontName) {
    const font = this.fonts.find((font) => font.name === fontName) || null;
    
    // If the font has axes, enhance them with proper names and default values
    if (font && font.axes) {
      Object.keys(font.axes).forEach(axisTag => {
        // Add proper name if missing
        if (!font.axes[axisTag].name) {
          font.axes[axisTag].name = getAxisName(axisTag);
        }
        
        // Set proper default value if missing or incorrect
        if (font.axes[axisTag].default === undefined || font.axes[axisTag].default === null) {
          font.axes[axisTag].default = getAxisDefaultValue(
            axisTag,
            font.axes[axisTag].min, 
            font.axes[axisTag].max
          );
        }
      });
    }
    
    return font;
  }

  /**
   * Creates a URL-friendly font family name
   * @param {string} fontName - The name of the font
   * @returns {string} - URL-friendly font family name
   */
  formatFontFamily(fontName) {
    return fontName.replace(/\s+/g, "+");
  }

  /**
   * Builds a URL for loading fonts from Google Fonts
   * @param {Object[]} requests - Array of font request objects
   * @param {Object} options - Additional options for the URL
   * @returns {string} - The constructed URL
   */
  buildUrl(requests, options = {}) {
    if (!Array.isArray(requests)) {
      requests = [requests];
    }

    let url = `${this.baseUrl}?`;

    requests.forEach((request, index) => {
      const font = this.getFont(request.family);
      if (!font) return;

      let family = `${this.formatFontFamily(request.family)}`;

      if (this.isVariableFont(font)) {
        const axes = Object.keys(font.axes).sort((a, b) => {
          const aIsUpper = a === a.toUpperCase();
          const bIsUpper = b === b.toUpperCase();
          if (aIsUpper && !bIsUpper) return 1;
          if (!aIsUpper && bIsUpper) return -1;
          return a.localeCompare(b);
        });

        const axisNames = axes.join(",");
        const axisValues = axes
          .map((axis) => {
            return `${font.axes[axis].min}..${font.axes[axis].max}`;
          })
          .join(",");

        if (axes.includes("ital")) {
          const italicValues = `ital,${axisNames}@0,${axisValues};1,${axisValues}`;
          family += `:${italicValues}`;
        } else {
          family += `:${axisNames}@${axisValues}`;
        }
      } else {
        const weights = request.weight
          ? [request.weight]
          : font.weights || [400];
        const styles = request.style
          ? [request.style]
          : font.styles || ["normal"];

        if (styles.includes("italic")) {
          const weightValues = weights.join(",");
          const italicValues = `ital,wght@${weights
            .map((weight) => `0,${weight}`)
            .join(";")};${weights.map((weight) => `1,${weight}`).join(";")}`;
          family += `:${italicValues}`;
        } else {
          const weightValues = weights.join(";");
          family += `:wght@${weightValues}`;
        }
      }

      if (index > 0) {
        url += "&";
      }
      url += `family=${family}`;
    });

    if (options.display) {
      url += `&display=${options.display}`;
    }

    return url;
  }

  /**
   * Loads a single font from Google Fonts
   * @param {string} fontName - Name of the font to load
   * @param {Object} options - Options for the font
   * @returns {Promise<boolean>} - Promise resolving to true if loaded successfully
   */
  async loadFont(fontName, options = {}) {
    if (this.loadedFonts.has(fontName)) return true;

    const font = this.getFont(fontName);
    if (!font) return false;

    try {
      // Create font request from options
      const request = {
        family: fontName,
        weight: options.weight,
        style: options.style,
      };

      // Add any custom axis values
      if (options.customAxesValues) {
        request.axes = options.customAxesValues;
      }

      // Handle weight array case
      if (options.weights && options.weights.length) {
        // We need to create multiple requests, one for each weight
        const requests = options.weights.map((weight) => ({
          ...request,
          weight: weight,
        }));

        // Also handle style array if present
        if (options.styles && options.styles.length) {
          // Create a request for each weight+style combination
          const combinedRequests = [];
          for (const weight of options.weights) {
            for (const style of options.styles) {
              combinedRequests.push({
                ...request,
                weight: weight,
                style: style,
              });
            }
          }

          // Use the combined requests if we created any
          if (combinedRequests.length > 0) {
            const url = this.buildUrl(combinedRequests, { display: "swap" });
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = url.toString();
            link.setAttribute("data-font", fontName);

            const loadPromise = new Promise((resolve, reject) => {
              link.onload = () => resolve(true);
              link.onerror = () =>
                reject(new Error(`Failed to load font: ${fontName}`));
            });

            document.head.appendChild(link);
            await loadPromise;
            this.loadedFonts.add(fontName);
            this.fontLinkElements.set(fontName, link);
            return true;
          }
        }

        // Use weight-specific requests
        const url = this.buildUrl(requests, { display: "swap" });
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url.toString();
        link.setAttribute("data-font", fontName);

        const loadPromise = new Promise((resolve, reject) => {
          link.onload = () => resolve(true);
          link.onerror = () =>
            reject(new Error(`Failed to load font: ${fontName}`));
        });

        document.head.appendChild(link);
        await loadPromise;
        this.loadedFonts.add(fontName);
        this.fontLinkElements.set(fontName, link);
        return true;
      }

      // Standard single font request
      const url = this.buildUrl(request, { display: "swap" });
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url.toString();
      link.setAttribute("data-font", fontName);

      const loadPromise = new Promise((resolve, reject) => {
        link.onload = () => resolve(true);
        link.onerror = () =>
          reject(new Error(`Failed to load font: ${fontName}`));
      });

      document.head.appendChild(link);
      await loadPromise;
      this.loadedFonts.add(fontName);
      this.fontLinkElements.set(fontName, link);
      return true;
    } catch (error) {
      console.error(`Error loading font ${fontName}:`, error);
      return false;
    }
  }

  /**
   * Unloads a font by removing its stylesheet from the document
   * @param {string} fontName - Name of the font to unload
   * @returns {boolean} - True if the font was unloaded, false if not found
   */
  unloadFont(fontName) {
    // Get the link element for this font
    const link = this.fontLinkElements.get(fontName);
    if (!link) {
      console.warn(`Cannot unload font ${fontName}: link element not found`);
      return false;
    }

    try {
      // Remove the link element from the document
      link.parentNode.removeChild(link);
      
      // Update tracking
      this.loadedFonts.delete(fontName);
      this.fontLinkElements.delete(fontName);
      
      console.log(`Successfully unloaded font: ${fontName}`);
      return true;
    } catch (error) {
      console.error(`Error unloading font ${fontName}:`, error);
      return false;
    }
  }

  /**
   * Loads multiple fonts from Google Fonts
   * @param {string[]} fontNames - Array of font names to load
   * @param {Object} options - Options for the fonts
   * @returns {Promise<Object>} - Promise resolving to object with results
   */
  async loadFonts(fontNames, options = {}) {
    const results = {};
    await Promise.allSettled(
      fontNames.map(async (name) => {
        results[name] = await this.loadFont(name, options);
      })
    );
    return results;
  }

  /**
   * Preloads a specified set of common fonts for better performance
   * @param {number} count - Number of fonts to preload (default 10)
   * @returns {Promise<Object>} - Promise resolving to object with results
   */
  async preloadCommonFonts(count = 10) {
    const commonFonts = this.fonts
      .slice(0, Math.min(count, this.fonts.length))
      .map((font) => font.name);
    return this.loadFonts(commonFonts);
  }

  /**
   * Gets a list of all available font names
   * @returns {string[]} - Array of font names
   */
  getAllFontNames() {
    return this.fonts.map((font) => font.name);
  }

  /**
   * Gets fonts by category
   * @param {string} category - The font category (e.g., "serif", "sans-serif")
   * @returns {Object[]} - Array of font objects in the category
   */
  getFontsByCategory(category) {
    const normalizedCategory = category.toUpperCase();
    return this.fonts.filter(
      (font) =>
        font.category && font.category.toUpperCase() === normalizedCategory
    );
  }

  /**
   * Checks if a font is a variable font
   * @param {string|Object} font - Font name or font object
   * @returns {boolean} - True if the font is variable (has axes)
   */
  isVariableFont(font) {
    if (typeof font === "string") {
      font = this.getFont(font);
    }

    return (font && font.axes && Object.keys(font.axes).length > 0) || false;
  }

  /**
   * Translates a font weight value to a readable name
   * @param {string|number} weight - Weight value (e.g., "regular", 400, "700italic")
   * @returns {string} - Human-readable weight name
   */
  translateWeightToName(weight) {
    const weightMap = {
      100: "Thin",
      200: "Extra Light",
      300: "Light",
      400: "Regular",
      regular: "Regular",
      500: "Medium",
      600: "Semi Bold",
      700: "Bold",
      800: "Extra Bold",
      900: "Black",
    };

    if (!weight) return "Regular";

    // Handle cases like "700italic"
    const numericPart = weight.toString().replace(/italic$/, "");
    const hasItalic = weight.toString().includes("italic");

    const weightName = weightMap[numericPart] || "Regular";
    return hasItalic ? `${weightName} Italic` : weightName;
  }

  /**
   * Generates a complete list of variants for a font
   * @param {string} fontName - The name of the font
   * @returns {Array} - Array of variant objects with weight, style, and display name
   */
  getFontVariants(fontName) {
    console.log(`Getting variants for font: ${fontName}`);
    const font = this.getFont(fontName);
    if (!font) {
      return [{ weight: 400, style: "normal", display: "Regular" }];
    }

    // Handle variable fonts that have weight axis
    if (this.isVariableFont(font) && font.axes.wght) {
      const styles = font.styles || ["normal"];
      const result = [];
      const { min = 100, max = 900 } = font.axes.wght;

      // Create variants in increments of 100 within the range
      for (
        let weight = Math.ceil(min / 100) * 100;
        weight <= Math.floor(max / 100) * 100;
        weight += 100
      ) {
        for (const style of styles) {
          result.push({
            weight: weight,
            style: style,
            display: `${this.translateWeightToName(weight)}${
              style === "italic" ? " Italic" : ""
            }`,
          });
        }
      }

      return result;
    }

    // Otherwise use weights and styles arrays to generate combinations
    const weights = font.weights || [400];
    const styles = font.styles || ["normal"];
    const result = [];

    for (const weight of weights) {
      for (const style of styles) {
        const variantName =
          weight === 400 && style === "normal"
            ? "regular"
            : `${weight}${style === "italic" ? "italic" : ""}`;

        result.push({
          weight: weight,
          style: style,
          display: this.translateWeightToName(variantName),
        });
      }
    }

    return result;
  }
}

export default GoogleFontsLoader;