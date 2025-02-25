/**
 * Google Fonts Loader Module
 * Handles loading and managing Google fonts with WebFont.js
 */

// Constants
export const FONTS_PER_PAGE = 20;

export class GoogleFontsLoader {
    constructor() {
        this.fontsData = [];
        this.currentFontIndex = 0;
        this.isLoadingFonts = false;
    }

    /**
     * Initialize the fonts loader
     * @param {string} jsonPath - Path to the fonts.json file
     */
    async init(jsonPath = '/fonts.json') {
        try {
            const response = await fetch(jsonPath);
            const data = await response.json();
            this.fontsData = data.items || [];
            return this.fontsData;
        } catch (error) {
            console.error('Failed to initialize Google Fonts loader:', error);
            throw error;
        }
    }

    /**
     * Load a batch of fonts
     * @param {number} startIndex - Starting index
     * @param {number} count - Number of fonts to load
     */
    async loadFontBatch(startIndex = 0, count = FONTS_PER_PAGE) {
        if (this.isLoadingFonts) return;
        
        this.isLoadingFonts = true;
        const endIndex = Math.min(startIndex + count, this.fontsData.length);
        const fontBatch = this.fontsData.slice(startIndex, endIndex);

        return new Promise((resolve, reject) => {
            const families = fontBatch.map(data => {
                const weights = data.variants
                    .map(variant => {
                        if (variant === 'regular') return '400';
                        if (variant === 'italic') return '400italic';
                        return variant.includes('italic') 
                            ? `${variant.replace('italic', '')}italic`
                            : variant;
                    })
                    .join(',');
                return `${data.family}:${weights}`;
            });

            WebFont.load({
                google: {
                    families: families
                },
                fontactive: (familyName, fvd) => {
                    console.log(`Font ${familyName} with variant ${fvd} loaded`);
                },
                fontinactive: (familyName, fvd) => {
                    console.warn(`Font ${familyName} with variant ${fvd} failed to load`);
                },
                active: () => {
                    this.isLoadingFonts = false;
                    resolve(fontBatch);
                },
                inactive: () => {
                    this.isLoadingFonts = false;
                    reject(new Error('Failed to load font batch'));
                }
            });
        });
    }

    /**
     * Get font information for a specific font family
     * @param {string} fontFamily - Name of the font family
     */
    getFontInfo(fontFamily) {
        const fontData = this.fontsData.find(font => font.family === fontFamily);
        if (!fontData) return null;

        const weights = [...new Set(
            fontData.variants
                .map(variant => parseInt(variant.replace('italic', '').replace('regular', '400')))
                .filter(weight => !isNaN(weight))
        )].sort((a, b) => a - b);

        return {
            name: fontData.family,
            source: fontData.files?.regular || fontData.files?.[400] || fontData.menu,
            style: 'Regular',
            features: [], // Google Fonts don't expose OpenType features
            axes: {
                'wght': {
                    name: 'Weight',
                    default: 400,
                    min: weights[0] || 100,
                    max: weights[weights.length - 1] || 900
                }
            },
            instances: weights.map(weight => ({
                name: { en: weight === 400 ? 'Regular' : this.translateWeightToName(weight) },
                coordinates: { 'wght': weight }
            })),
            variants: fontData.variants,
            files: fontData.files
        };
    }

    /**
     * Translate numerical weight to name
     * @param {string|number} weight - Font weight
     */
    translateWeightToName(weight) {
        const weightNames = {
            100: 'Thin',
            200: 'Extra Light',
            300: 'Light',
            400: 'Regular',
            500: 'Medium',
            600: 'Semi Bold',
            700: 'Bold',
            800: 'Extra Bold',
            900: 'Black'
        };

        weight = weight.toString();
        if (weight === 'regular') return 'Regular';
        if (weight === 'italic') return 'Italic';

        const numWeight = parseInt(weight.replace('italic', ''));
        const isItalic = weight.includes('italic');
        const baseName = weightNames[numWeight] || weight;
        
        return isItalic ? `${baseName} Italic` : baseName;
    }
}

export const googleFontsLoader = new GoogleFontsLoader();