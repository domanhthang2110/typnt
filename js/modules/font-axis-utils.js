/**
 * Font Axis Utilities
 * Provides translation of font axis tags to human-readable names
 */

// Standard and registered axis tags mapping to human-readable names and default values
const AXIS_NAMES = {
  // Standard axes
  'wght': { name: 'Weight', default: 400 },
  'wdth': { name: 'Width', default: 100 },
  'ital': { name: 'Italic', default: 0 },
  'slnt': { name: 'Slant', default: 0 },
  'opsz': { name: 'Optical Size', default: 14 },

  // Registered axes
  'ARRR': { name: 'AR Retinal Resolution', default: 10 },
  'YTAS': { name: 'Ascender Height', default: 750 },
  'BLED': { name: 'Bleed', default: 0 },
  'BNCE': { name: 'Bounce', default: 0 },
  'CASL': { name: 'Casual', default: 0 },
  'XTRA': { name: 'Counter Width', default: 400 },
  'CRSV': { name: 'Cursive', default: 0.5 },
  'YTDE': { name: 'Descender Depth', default: -250 },
  'EHLT': { name: 'Edge Highlight', default: 12 },
  'ELXP': { name: 'Element Expansion', default: 0 },
  'ELGR': { name: 'Element Grid', default: 1 },
  'ELSH': { name: 'Element Shape', default: 0 },
  'EDPT': { name: 'Extrusion Depth', default: 100 },
  'YTFI': { name: 'Figure Height', default: 600 },
  'FILL': { name: 'Fill', default: 0 },
  'FLAR': { name: 'Flare', default: 0 },
  'GRAD': { name: 'Grade', default: 0 },
  'XELA': { name: 'Horizontal Element Alignment', default: 0 },
  'XPN1': { name: 'Horizontal Position of Paint 1', default: 0 },
  'XPN2': { name: 'Horizontal Position of Paint 2', default: 0 },
  'HEXP': { name: 'Hyper Expansion', default: 0 },
  'INFM': { name: 'Informality', default: 0 },
  'YTLC': { name: 'Lowercase Height', default: 500 },
  'MONO': { name: 'Monospace', default: 0 },
  'MORF': { name: 'Morph', default: 0 },
  'XROT': { name: 'Rotation in X', default: 0 },
  'YROT': { name: 'Rotation in Y', default: 0 },
  'ZROT': { name: 'Rotation in Z', default: 0 },
  'ROND': { name: 'Roundness', default: 0 },
  'SCAN': { name: 'Scanlines', default: 0 },
  'SHLN': { name: 'Shadow Length', default: 50 },
  'SHRP': { name: 'Sharpness', default: 0 },
  'SZP1': { name: 'Size of Paint 1', default: 0 },
  'SZP2': { name: 'Size of Paint 2', default: 0 },
  'SOFT': { name: 'Softness', default: 0 },
  'SPAC': { name: 'Spacing', default: 0 },
  'XOPQ': { name: 'Thick Stroke', default: 88 },
  'YOPQ': { name: 'Thin Stroke', default: 116 },
  'YTUC': { name: 'Uppercase Height', default: 725 },
  'YELA': { name: 'Vertical Element Alignment', default: 0 },
  'YEXT': { name: 'Vertical Extension', default: 0 },
  'YPN1': { name: 'Vertical Position of Paint 1', default: 0 },
  'YPN2': { name: 'Vertical Position of Paint 2', default: 0 },
  'VOLM': { name: 'Volume', default: 0 },
  'WONK': { name: 'Wonky', default: 0 },
  'YEAR': { name: 'Year', default: 2000 }
};

/**
 * Returns a human-readable name for a font axis tag
 * @param {string} axisTag - The axis tag (e.g., 'wght', 'wdth')
 * @returns {string} - Human-readable name
 */
function getAxisName(axisTag) {
  // Check if we have a predefined name
  if (AXIS_NAMES[axisTag]) {
    return AXIS_NAMES[axisTag].name;
  }
  
  // For custom axes, try to make it more readable
  // If it's all caps, it's likely a registered custom axis
  if (axisTag === axisTag.toUpperCase()) {
    // Try to make it look nicer by adding spaces
    return axisTag.split('').join(' ').trim();
  }
  
  // For lowercase axis tags, capitalize first letter
  return axisTag.charAt(0).toUpperCase() + axisTag.slice(1);
}

/**
 * Returns the default value for a font axis tag
 * @param {string} axisTag - The axis tag (e.g., 'wght', 'wdth') 
 * @param {number|null} min - Minimum value of the axis (optional)
 * @param {number|null} max - Maximum value of the axis (optional)
 * @returns {number} - Default value for the axis
 */
function getAxisDefaultValue(axisTag, min = null, max = null) {
  // Check if we have a predefined default value
  if (AXIS_NAMES[axisTag]) {
    return AXIS_NAMES[axisTag].default;
  }
  
  // Special handling for weight if not in our dictionary
  if (axisTag.toLowerCase() === 'wght') {
    return 400;
  }
  
  // For other axes, prefer 0 if it's in range
  if (min !== null && max !== null) {
    if (min <= 0 && 0 <= max) {
      return 0;
    }
    // If 0 is not in range, use min
    return min;
  }
  
  // Default to 0 if we don't know the range
  return 0;
}

export { getAxisName, getAxisDefaultValue, AXIS_NAMES };
