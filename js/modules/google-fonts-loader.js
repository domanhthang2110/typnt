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
        this.lastFilterIndex = 0;  // Add this to track position in filtered search
    }

    /**
     * Normalize variant strings to WebFont format
     * @param {string} variant - Font variant (e.g., 'regular', 'italic', '500', '500italic')
     * @returns {string} Normalized variant (e.g., '400', '400italic', '500', '500italic')
     */
    normalizeVariant(variant) {
        if (variant === 'regular') return '400';
        if (variant === 'italic') return '400italic';
        return variant;
    }

    // Add this new method
    getFonts() {
        return this.fontsData;
    }

    async getFontsByCategory(category, page = 0) {
        const startIndex = page * FONTS_PER_PAGE;
        let filteredFonts;

        // Filter fonts by category
        filteredFonts = this.fontsData.filter(font => 
            font.category?.toLowerCase() === category.toLowerCase()
        );

        const paginatedFonts = filteredFonts.slice(startIndex, startIndex + FONTS_PER_PAGE);
        
        // Load the fonts if needed
        await this.loadFonts(paginatedFonts);

        return {
            fonts: paginatedFonts,
            hasMore: startIndex + FONTS_PER_PAGE < filteredFonts.length,
            totalFonts: filteredFonts.length,
            currentPage: page
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
            currentPage: page
        };
    }

    // Add helper method to handle font loading
    async loadFonts(fontsToLoad) {
        const unloadedFonts = fontsToLoad.filter(font => !this.loadedFonts.has(font.family));
        if (unloadedFonts.length === 0) return;

        const families = unloadedFonts.map(font => {
            const weights = font.variants
                .map(v => this.normalizeVariant(v))
                .join(',');
            return `${font.family}:${weights}`;
        });

        return new Promise((resolve) => {
            WebFont.load({
                google: { families },
                active: () => {
                    unloadedFonts.forEach(font => this.loadedFonts.add(font.family));
                    resolve();
                },
                inactive: resolve // Don't block on failure
            });
        });
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

    async searchFonts(query, page = 0) {
        const startIndex = page * FONTS_PER_PAGE;
        const queryLower = query.toLowerCase();
        
        // Filter fonts that contain the search query
        const searchResults = this.fontsData.filter(font => 
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

        const paginatedResults = searchResults.slice(startIndex, startIndex + FONTS_PER_PAGE);
        await this.loadFonts(paginatedResults);

        return {
            fonts: paginatedResults,
            hasMore: startIndex + FONTS_PER_PAGE < searchResults.length,
            totalFonts: searchResults.length,
            currentPage: page
        };
    }

    async loadSingleFont(fontFamily) {
        if (this.loadedFonts.has(fontFamily)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            WebFont.load({
                google: {
                    families: [fontFamily]
                },
                active: () => {
                    this.loadedFonts.add(fontFamily);
                    resolve();
                },
                inactive: () => {
                    reject(new Error(`Failed to load font: ${fontFamily}`));
                },
                timeout: 2000 // 2 seconds timeout
            });
        });
    }
}

export const googleFontsLoader = new GoogleFontsLoader();