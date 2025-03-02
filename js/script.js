// scripts.js

import { googleFontsLoader } from './modules/google-fonts-loader.js';
import { initDebugTools } from "./debug-tools.js";
// Simplify constants
const fontContainer = document.getElementById("font-container");
const searchInput = document.querySelector('input[placeholder="Search"]');
const masterSlider = document.querySelector(".master-slider");
const sliderValue = document.getElementById("sliderValue");
let isUpdating = false;

// Keep essential categories
const categories = ['all', 'serif', 'sans-serif', 'display', 'handwriting', 'monospace'];
let currentCategory = 'all';

let currentState = {
    category: 'all',
    page: 0,
    hasMore: true,
    totalFonts: 0,
    masterFontSize: 96,
    searchTerm: '',
    viewMode: 'list',     // Add these
    textAlign: 'left'     // new properties
};

// Event Listeners
document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
    try {
        await googleFontsLoader.init('fonts.json');
        
        // Set initial view mode class
        fontContainer.classList.add(`${currentState.viewMode}-view`);
        updateViewButtonStates();
        updateAlignButtonStates(currentState.textAlign);
        
        await loadAndDisplayFonts(true);
        setupEventListeners();
        setupIntersectionObserver();
        initDebugTools();
    } catch (error) {
        console.error("Failed to initialize app:", error);
        fontContainer.innerHTML = '<div class="text-center text-red-400">Failed to load fonts</div>';
    }
}

async function loadAndDisplayFonts(reset = false) {
    if (reset) {
        currentState.page = 0;
        fontContainer.innerHTML = '';
    }

    try {
        let result;
        
        if (currentState.searchTerm) {
            result = await googleFontsLoader.searchFonts(currentState.searchTerm, currentState.page);
        } else {
            result = currentState.category === 'all'
                ? await googleFontsLoader.getFontInfoBatch(currentState.page)
                : await googleFontsLoader.getFontsByCategory(currentState.category, currentState.page);
        }

        // Update total count regardless of whether fonts were found
        currentState.totalFonts = result.totalFonts;
        const totalEntry = document.querySelector('.total-entry');
        if (totalEntry) {
            totalEntry.textContent = `${result.totalFonts} Total`;
        }

        if (result.fonts.length > 0) {
            displayFonts(result.fonts, !reset);
            currentState.hasMore = result.hasMore;
            currentState.page++;
        } else if (reset) {
            fontContainer.innerHTML = '<div class="text-center text-gray-400">No fonts found</div>';
            currentState.hasMore = false;
        }
    } catch (error) {
        console.error('Error loading fonts:', error);
    }
}

function createFontCard(fontData) {
    const card = document.createElement("div");
    card.classList.add("card", "bg", "border", "border-[#4F4F4F]", "hover:border-[#FFF9F9]",
        "transition-colors", "duration-300", "ease-in-out", "shadow-lg", "mb-6", "relative");

    // Update the slider input value to match master
    const sliderHtml = `<input type="range" min="12" max="210" value="${currentState.masterFontSize}" class="slider">`;
    
    // Update the initial font size to match master
    const sampleStyle = `font-family: '${fontData.family}', sans-serif; 
                        font-size: ${currentState.masterFontSize}px; 
                        line-height: ${currentState.masterFontSize * 1.4}px;
                        text-align: ${currentState.textAlign};`;

    card.innerHTML = `
        <div class="flex justify-between items-center w-full card-header">
            <div class="flex items-center gap-2">
                <a href="glyph.html?font=${encodeURIComponent(fontData.family)}">
                    <h3 class="text-sm text-white">${fontData.family}</h3>
                </a>
                <div class="text-xs text-[#9C9C9C] px-2 py-1 border border-[#4F4F4F] rounded-full ml-2">
                    ${fontData.category || 'unknown'}
                </div>
            </div>
            <p class="text-sm text-gray-400 styles-count">${fontData.variants.length} styles</p>
        </div>
        
        <div class="flex items-center gap-2 controls-container mt-2">
            ${sliderHtml}
            ${createVariantDropdownHTML(fontData.variants)}
        </div>
        
        <div class="card-sample-container">
            <p class="card-sample text-8xl outline-none" 
               contenteditable="true" 
               style="${sampleStyle}">
                ${fontData.family}
            </p>
            <div class="font-size-indicator" style="position: absolute; right: 10px; top: 10px; 
                 background-color: rgba(0,0,0,0.7); color: white; padding: 3px 6px; 
                 border-radius: 3px; font-size: 12px; opacity: 0; transition: opacity 0.2s ease">
                96px
            </div>
        </div>
        
        <div class="justify-between items-center w-full absolute bottom-2 left-2 card-footer">
            <p class="text-sm text-gray-400">${Math.random() > 0.5 ? "Open source" : "Closed source"}</p>
            <p class="text-sm text-gray-400">Designed by ${fontData.designer || 'Unknown'}</p>
        </div>
    `;

    setupCardInteractions(card, fontData);
    return card;
}

function createVariantDropdownHTML(variants) {
    // Generate a unique ID for this card's radio group
    const radioGroupName = `variant-${Math.random().toString(36).substr(2, 9)}`;
    
    const options = variants.map(variant => 
        `<label class="block px-2 py-2 text-sm">
            <input type="radio" name="${radioGroupName}" 
                   value="${variant}" ${variant === 'regular' ? 'checked' : ''}>
            ${googleFontsLoader.translateWeightToName(variant)}
        </label>`
    ).join('');

    return `
        <div class="relative variantDropdown">
            <button type="button" class="dropdown-button relative z-40 text-white 
                    transition-all duration-200 flex items-center gap-2 opacity-0">
                <span>${googleFontsLoader.translateWeightToName("regular")}</span>
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
    const sample = card.querySelector('.card-sample');
    const slider = card.querySelector('.slider');
    const indicator = card.querySelector('.font-size-indicator');
    const variantDropdown = card.querySelector('.variantDropdown');
    
    // Add card hover handlers
    card.addEventListener('mouseenter', () => {
        // Only restore if dropdown was in open state
        if (variantDropdown.classList.contains('dropdown-open')) {
            showDropdownContent(variantDropdown);
        }
    });

    card.addEventListener('mouseleave', () => {
        // Hide content but maintain open state
        hideDropdownContent(variantDropdown);
    });

    slider.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        updateSampleSize(sample, size);
        updateSliderVisual(slider, size);
        showSizeIndicator(indicator, size);
    });

    setupVariantDropdown(variantDropdown, sample);
}

// Add these new helper functions
function showDropdownContent(dropdown) {
    const button = dropdown.querySelector('.dropdown-button');
    const dropdownContent = dropdown.querySelector('.dropdown-content');
    const triangle = button.querySelector('.dd-triangle');
    
    button.style.backgroundColor = "transparent";
    dropdownContent.classList.add("opacity-100", "visible", "border", "border-[#4F4F4F]");
    dropdownContent.classList.remove("opacity-0", "invisible");
    triangle.classList.add("rotate-triangle");
}

function hideDropdownContent(dropdown) {
    const button = dropdown.querySelector('.dropdown-button');
    const dropdownContent = dropdown.querySelector('.dropdown-content');
    const triangle = button.querySelector('.dd-triangle');
    
    button.style.backgroundColor = "";
    dropdownContent.classList.remove("opacity-100", "visible", "border", "border-[#4F4F4F]");
    dropdownContent.classList.add("opacity-0", "invisible");
    triangle.classList.remove("rotate-triangle");
}

function setupVariantDropdown(variantDropdown, sample) {
    let isDropdownVisible = false;
    const button = variantDropdown.querySelector('.dropdown-button');
    const dropdownContent = variantDropdown.querySelector('.dropdown-content');

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

    variantDropdown.addEventListener("change", (e) => {
        if (!e.target.matches('input[type="radio"]')) return;
        
        const selectedVariant = e.target.value;
        const buttonText = variantDropdown.querySelector("button span:first-child");
        buttonText.textContent = googleFontsLoader.translateWeightToName(selectedVariant);
        
        if (selectedVariant === "regular") {
            sample.style.fontWeight = "400";
            sample.style.fontStyle = "normal";
        } else {
            sample.style.fontWeight = selectedVariant.replace("italic", "") || "400";
            sample.style.fontStyle = selectedVariant.includes("italic") ? "italic" : "normal";
        }
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
        if (!categoriesButton.contains(e.target) && !dropdownContent.contains(e.target)) {
            closeDropdown(dropdownContent, triangle, categoriesButton);
        }
    });

    // Category radio buttons
    const categoryRadios = document.querySelectorAll('#dropdownContent input[type="radio"]');
    categoryRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
            const category = e.target.value;
            if (currentState.category === category) return;
            
            // Update state and UI
            currentState.category = category;
            currentState.searchTerm = '';
            
            // Close dropdown and update UI
            closeDropdown(dropdownContent, triangle, categoriesButton);
            
            // Update button text with selected category name
            const categoryName = e.target.parentElement.textContent.trim();
            categoriesButton.querySelector('span:first-child').textContent = 
                category === 'all' ? 'Categories' : categoryName;
            
            await loadAndDisplayFonts(true);
        });
    });
    
    // Update the checked radio button based on the current category
    function updateCategoryRadioState(category) {
        const radio = document.querySelector(`#dropdownContent input[value="${category}"]`);
        if (radio) radio.checked = true;
    }
    
    // Initialize radio button state
    updateCategoryRadioState(currentState.category);

    // Category buttons
    categories.forEach(category => {
        const categoryBtn = document.getElementById(`${category}-Button`);
        if (categoryBtn) {
            categoryBtn.addEventListener("click", async () => {
                if (currentState.category === category) return;
                
                currentState.category = category;
                
                // Close dropdown and update UI
                closeDropdown(dropdownContent, triangle, categoriesButton);
                
                // Update button text
                categoriesButton.querySelector('span:first-child').textContent = 
                    category === 'all' ? 'Categories' : category.charAt(0).toUpperCase() + category.slice(1);
                
                await loadAndDisplayFonts(true);
                updateCategoryButtonStates(category);
            });
        }
    });

    // Search functionality
    let searchTimeout = null;
    searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTimeout) clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(async () => {
            // Reset category when searching
            currentState.category = 'all';
            currentState.searchTerm = searchTerm;
            updateCategoryButtonStates('all');
            
            // Update category button text
            const categoriesButton = document.getElementById("categoriesButton");
            if (categoriesButton) {
                categoriesButton.querySelector('span:first-child').textContent = 'Categories';
            }
            
            await loadAndDisplayFonts(true);
        }, 300);
    });

    // Add master slider handler
    masterSlider.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        currentState.masterFontSize = size;
        
        // Update display value
        sliderValue.textContent = `${size} px`;
        
        // Update master slider visual
        updateSliderVisual(masterSlider, size);
        
        // Update all card sliders and samples
        document.querySelectorAll('.card').forEach(card => {
            const sample = card.querySelector('.card-sample');
            const slider = card.querySelector('.slider');
            const indicator = card.querySelector('.font-size-indicator');
            
            if (sample && slider) {
                slider.value = size;
                updateSampleSize(sample, size);
                updateSliderVisual(slider, size);
                showSizeIndicator(indicator, size);
            }
        });
    });

    // View mode toggle
    const listViewBtn = document.getElementById('listViewBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');

    listViewBtn.addEventListener('click', () => {
        if (currentState.viewMode === 'list') return;
        currentState.viewMode = 'list';
        fontContainer.classList.remove('grid-view');
        fontContainer.classList.add('list-view');
        updateViewButtonStates();
    });

    gridViewBtn.addEventListener('click', () => {
        if (currentState.viewMode === 'grid') return;
        currentState.viewMode = 'grid';
        fontContainer.classList.remove('list-view');
        fontContainer.classList.add('grid-view');
        updateViewButtonStates();
    });

    // Text alignment buttons
    ['Left', 'Center', 'Right'].forEach(align => {
        const btn = document.getElementById(`align${align}Btn`);
        if (btn) {
            btn.addEventListener('click', () => {
                const alignment = align.toLowerCase();
                if (currentState.textAlign === alignment) return;
                
                currentState.textAlign = alignment;
                updateTextAlignment(alignment);
                updateAlignButtonStates(alignment);
            });
        }
    });
}

function openDropdown(content, triangle, button) {
    content.classList.add("visible", "opacity-100", "border", "border-[#4F4F4F]");
    content.classList.remove("invisible", "opacity-0");
    triangle.classList.add("rotate-triangle");
    button.style.backgroundColor = "transparent";
}

function closeDropdown(content, triangle, button) {
    content.classList.remove("visible", "opacity-100", "border", "border-[#4F4F4F]");
    content.classList.add("invisible", "opacity-0");
    triangle.classList.remove("rotate-triangle");
    button.style.backgroundColor = "";
}

function displayFonts(fonts, append = false) {
    if (!Array.isArray(fonts) || fonts.length === 0) return;

    const fragment = document.createDocumentFragment();
    fonts.forEach(font => {
        try {
            const card = createFontCard(font);
            fragment.appendChild(card);
        } catch (error) {
            console.error(`Error creating card for ${font.family}:`, error);
        }
    });

    if (!append) {
        fontContainer.innerHTML = '';
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
    categories.forEach(category => {
        const btn = document.getElementById(`${category}-Button`);
        if (btn) {
            if (category === selectedCategory) {
                btn.classList.add("text-white");
                btn.classList.remove("text-[#9C9C9C]");
            } else {
                btn.classList.remove("text-white");
                btn.classList.add("text-[#9C9C9C]");
            }
        }
    });
}

function updateViewButtonStates() {
    const listBtn = document.getElementById('listViewBtn');
    const gridBtn = document.getElementById('gridViewBtn');

    if (currentState.viewMode === 'list') {
        listBtn.classList.add('text-white');
        listBtn.classList.remove('text-[#9C9C9C]');
        gridBtn.classList.add('text-[#9C9C9C]');
        gridBtn.classList.remove('text-white');
    } else {
        gridBtn.classList.add('text-white');
        gridBtn.classList.remove('text-[#9C9C9C]');
        listBtn.classList.add('text-[#9C9C9C]');
        listBtn.classList.remove('text-white');
    }
}

function updateAlignButtonStates(selectedAlign) {
    ['Left', 'Center', 'Right'].forEach(align => {
        const btn = document.getElementById(`align${align}Btn`);
        if (btn) {
            const isSelected = align.toLowerCase() === selectedAlign;
            btn.classList.toggle('text-white', isSelected);
            btn.classList.toggle('text-[#9C9C9C]', !isSelected);
            btn.classList.toggle('bg-[#4F4F4F]', isSelected);
        }
    });
}

function updateTextAlignment(alignment) {
    document.querySelectorAll('.card-sample').forEach(sample => {
        sample.style.textAlign = alignment;
    });
}

function clampSize(size) {
    return Math.min(Math.max(size, 12), 210);
}