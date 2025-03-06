import { GoogleFontsLoader } from "./modules/google-fonts-loader.js";
import { updateSliderVisual } from "./glyph.js";
class TypographyLayoutManager {
  constructor() {
    this.fontLoader = null;
    this.fontFamily = null;
    this.variantObjects = [];
    this.init();
  }

  async init() {
    try {
      // Initialize font loader
      this.fontLoader = await GoogleFontsLoader.fromJson("/data/fontinfo.json");

      // Get font family from URL
      const urlParams = new URLSearchParams(window.location.search);
      this.fontFamily = urlParams.get("font");

      if (!this.fontFamily) {
        console.error("No font family specified in URL");
        return;
      }

      // Load font variants
      this.variantObjects = await this.fontLoader.getFontVariants(
        this.fontFamily
      );

      // Initialize layout components
      this.setupLayoutBlocks();
      this.attachEventListeners();
    } catch (error) {
      console.error("Failed to initialize layout manager:", error);
    }
  }

  setupLayoutBlocks() {
    const blockFonts = document.querySelectorAll(".block-font-name");
    blockFonts.forEach((element) => {
      element.textContent = this.fontFamily;
    });
    
    // Apply the font family and appropriate font size to all block content
    const blockContents = document.querySelectorAll(".block-content");
    blockContents.forEach((content) => {
      const block = content.closest(".layout-block");
      if (block) {
        // Apply the font family
        content.style.fontFamily = this.fontFamily;
        
        // Set font size based on column count
        const columns = block.getAttribute("data-columns");
        let fontSize;
        switch(parseInt(columns)) {
          case 1:
            fontSize = 94;
            break;
          case 2:
            fontSize = 32;
            break;
          case 3:
            fontSize = 18;
            break;
          default:
            fontSize = 16;
        }
        
        // Apply the font size
        content.style.fontSize = `${fontSize}px`;
        
        // Update the size display value
        const sizeDisplay = block.querySelector(".size-value");
        if (sizeDisplay) {
          sizeDisplay.textContent = `${fontSize}px`;
        }
        
        // Update the slider value
        const sizeSlider = block.querySelector(".master-slider");
        if (sizeSlider) {
          sizeSlider.value = fontSize;
          updateSliderVisual(sizeSlider, fontSize);
        }
        
        // Set appropriate line height based on font size
        const lineHeight = Math.max(1.2, Math.min(1.8, 1.6 - (fontSize - 16) * 0.005));
        //content.style.lineHeight = lineHeight;
      }
    });

    // Populate all style dropdowns with the font variants
    const styleDropdowns = document.querySelectorAll(".style-dropdown");
    styleDropdowns.forEach((dropdown) => {
      this.populateFontStyleOptions(dropdown);
    });

    // Convert column dropdowns to custom dropdowns
    const columnDropdowns = document.querySelectorAll(".columns-dropdown");
    columnDropdowns.forEach((dropdown) => {
      this.convertToCustomColumnsDropdown(dropdown);
    });
  }

  /**
   * Populates font style options in the dropdown
   * @param {HTMLSelectElement} dropdown - The dropdown to populate
   */
  populateFontStyleOptions(dropdown) {
    // Instead of working with a select element, we need to:
    // 1. Replace the select element with a custom dropdown
    // 2. Generate HTML similar to createVariantDropdownHTML in script.js
    // 3. Set up event listeners for this custom dropdown

    // Get the parent container which holds the select element
    const controlGroup = dropdown.parentElement;
    
    // Create the custom dropdown structure
    const customDropdown = this.createCustomVariantDropdown(this.variantObjects);
    
    // Replace the select with the custom dropdown
    controlGroup.innerHTML = customDropdown;
    
    // Set up event listeners for the new dropdown
    this.setupVariantDropdown(controlGroup.querySelector('.variantDropdown'));
  }

  /**
   * Converts the standard columns dropdown to a custom dropdown
   * @param {HTMLSelectElement} dropdown - The dropdown to convert
   */
  convertToCustomColumnsDropdown(dropdown) {
    // Get the parent container
    const controlGroup = dropdown.parentElement;
    
    // Create the custom dropdown structure
    const customDropdown = this.createCustomColumnsDropdown();
    
    // Replace the select with the custom dropdown
    controlGroup.innerHTML = customDropdown;
    
    // Set up event listeners
    this.setupColumnsDropdown(controlGroup.querySelector('.columnsDropdown'));
  }

  /**
   * Creates a custom variant dropdown HTML structure similar to script.js
   */
  createCustomVariantDropdown(variants) {
    // Generate a unique ID for this dropdown
    const radioGroupName = `variant-${Math.random().toString(36).substr(2, 9)}`;
    
    // Find the default variant (regular/400 normal)
    const defaultVariantIndex = variants.findIndex(v => 
      v.weight === 400 && v.style === 'normal'
    ) || 0;
    
    // Generate options HTML
    const options = variants.map((variant, index) => {
      const isDefault = index === defaultVariantIndex;
      const valueAttr = `${variant.weight}${variant.style === 'italic' ? 'italic' : ''}`;
      
      return `<label class="block px-2 py-2">
        <input type="radio" name="${radioGroupName}" 
          data-weight="${variant.weight}" 
          data-style="${variant.style}"
          value="${valueAttr}" 
          ${isDefault ? 'checked' : ''}>
        ${variant.display}
      </label>`;
    }).join('');
    
    // Return the full dropdown HTML structure
    return `
      <div class="relative variantDropdown">
        <button type="button" class="dropdown-button relative z-40 text-white 
                transition-all duration-200 flex items-center gap-2">
          <span>${this.fontLoader.translateWeightToName("regular")}</span>
          <span class="ml-1 text-xl dd-triangle">▾</span>
        </button>
        <div class="absolute pl-2 transition-all duration-200 ease-in-out 
                  opacity-0 invisible w-full z-20 overflow-hidden dropdown-content block-control">
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

  /**
   * Creates a custom columns dropdown HTML structure
   */
  createCustomColumnsDropdown() {
    // Generate a unique ID for this dropdown
    const radioGroupName = `columns-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create options for 1, 2, and 3 columns
    const options = [
      { value: "1", display: "1 Column" },
      { value: "2", display: "2 Columns" },
      { value: "3", display: "3 Columns" }
    ].map((option, index) => {
      const isDefault = index === 0; // 1 column as default
      
      return `<label class="block px-2 py-2">
        <input type="radio" name="${radioGroupName}" 
          data-columns="${option.value}" 
          value="${option.value}" 
          ${isDefault ? 'checked' : ''}>
        ${option.display}
      </label>`;
    }).join('');
    
    // Return the full dropdown HTML structure
    return `
      <div class="relative columnsDropdown">
        <button type="button" class="dropdown-button relative z-40 text-white 
                transition-all duration-200 flex items-center gap-2">
          <span>1 Column</span>
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

  /**
   * Set up the dropdown interaction (copied from script.js)
   */
  setupVariantDropdown(variantDropdown) {
    if (!variantDropdown) return;
    
    let isDropdownVisible = false;
    const button = variantDropdown.querySelector('.dropdown-button');
    const dropdownContent = variantDropdown.querySelector('.dropdown-content');
    const block = variantDropdown.closest('.layout-block');
    const content = block.querySelector('.block-content');
    
    // Button click handler to toggle dropdown
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      isDropdownVisible = !isDropdownVisible;
      
      if (isDropdownVisible) {
        variantDropdown.classList.add("dropdown-open");
        this.showDropdownContent(variantDropdown);
      } else {
        variantDropdown.classList.remove("dropdown-open");
        this.hideDropdownContent(variantDropdown);
      }
    });

    // Click outside to close
    document.addEventListener("click", (e) => {
      if (isDropdownVisible && !variantDropdown.contains(e.target)) {
        isDropdownVisible = false;
        variantDropdown.classList.remove("dropdown-open");
        this.hideDropdownContent(variantDropdown);
      }
    });

    // Radio button change handler
    variantDropdown.addEventListener("change", async (e) => {
      if (!e.target.matches('input[type="radio"]')) return;
      
      const weight = parseInt(e.target.dataset.weight) || 400;
      const style = e.target.dataset.style || 'normal';
      const buttonText = variantDropdown.querySelector("button span:first-child");
      
      // Update button text with selected variant name
      buttonText.textContent = this.fontLoader.translateWeightToName(
        style === 'italic' ? `${weight}italic` : weight
      );
      
      // Apply the weight and style to the content
      content.style.fontWeight = weight;
      content.style.fontStyle = style;
      
      // Load the appropriate font style
      const options = {
        weights: [weight],
        styles: [style]
      };
      
      await this.fontLoader.loadFont(this.fontFamily, options);
      
      // Close dropdown after selection
      isDropdownVisible = false;
      variantDropdown.classList.remove("dropdown-open");
      this.hideDropdownContent(variantDropdown);
    });
  }

  /**
   * Set up the columns dropdown interaction
   */
  setupColumnsDropdown(columnsDropdown) {
    if (!columnsDropdown) return;
    
    let isDropdownVisible = false;
    const button = columnsDropdown.querySelector('.dropdown-button');
    const dropdownContent = columnsDropdown.querySelector('.dropdown-content');
    const block = columnsDropdown.closest('.layout-block');
    
    // Button click handler to toggle dropdown
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      isDropdownVisible = !isDropdownVisible;
      
      if (isDropdownVisible) {
        columnsDropdown.classList.add("dropdown-open");
        this.showDropdownContent(columnsDropdown);
      } else {
        columnsDropdown.classList.remove("dropdown-open");
        this.hideDropdownContent(columnsDropdown);
      }
    });

    // Click outside to close
    document.addEventListener("click", (e) => {
      if (isDropdownVisible && !columnsDropdown.contains(e.target)) {
        isDropdownVisible = false;
        columnsDropdown.classList.remove("dropdown-open");
        this.hideDropdownContent(columnsDropdown);
      }
    });

    // Radio button change handler
    columnsDropdown.addEventListener("change", (e) => {
      if (!e.target.matches('input[type="radio"]')) return;
      
      const columns = e.target.dataset.columns;
      const buttonText = columnsDropdown.querySelector("button span:first-child");
      
      // Update button text with selected column count
      buttonText.textContent = `${columns} ${columns === '1' ? 'Column' : 'Columns'}`;
      
      // Update the layout block
      block.setAttribute("data-columns", columns);
      
      // Close dropdown after selection
      isDropdownVisible = false;
      columnsDropdown.classList.remove("dropdown-open");
      this.hideDropdownContent(columnsDropdown);
    });
  }

  // Helper methods for dropdown visibility
  showDropdownContent(dropdown) {
    const button = dropdown.querySelector('.dropdown-button');
    const dropdownContent = dropdown.querySelector('.dropdown-content');
    const triangle = button.querySelector('.dd-triangle');
    
    button.style.backgroundColor = "transparent";
    dropdownContent.classList.add("opacity-100", "visible", "border", "border-[#4F4F4F]");
    dropdownContent.classList.remove("opacity-0", "invisible");
    triangle.classList.add("rotate-triangle");
  }

  hideDropdownContent(dropdown) {
    const button = dropdown.querySelector('.dropdown-button');
    const dropdownContent = dropdown.querySelector('.dropdown-content');
    const triangle = button.querySelector('.dd-triangle');
    
    button.style.backgroundColor = "";
    dropdownContent.classList.remove("opacity-100", "visible", "border", "border-[#4F4F4F]");
    dropdownContent.classList.add("opacity-0", "invisible");
    triangle.classList.remove("rotate-triangle");
  }

  /**
   * Apply the selected font style to a content element
   * @param {HTMLElement} content - The content element to style
   * @param {HTMLOptionElement} option - The selected option with style data
   */
  applyFontStyle(content, option) {
    if (!content || !option) return;

    content.style.fontWeight = option.dataset.weight || "400";
    content.style.fontStyle = option.dataset.style || "normal";
  }

  /**
   * Attach event listeners to all interactive elements
   */
  attachEventListeners() {
    // Size sliders
    document.querySelectorAll(".master-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => this.handleSizeChange(e));
    });

    // Style dropdowns
    document.querySelectorAll(".style-dropdown").forEach((dropdown) => {
      dropdown.addEventListener("change", (e) => this.handleStyleChange(e));
    });

    // Column dropdowns
    document.querySelectorAll(".columns-dropdown").forEach((dropdown) => {
      dropdown.addEventListener("change", (e) => this.handleColumnsChange(e));
    });

    // Clone buttons
    document.querySelectorAll(".clone-button").forEach((button) => {
      button.addEventListener("click", (e) => this.cloneBlock(e));
    });

    // Remove buttons
    document.querySelectorAll(".remove-button").forEach((button) => {
      button.addEventListener("click", (e) => this.removeBlock(e));
    });
  }

  /**
   * Handle font size slider change
   * @param {Event} e - Input event
   */
  handleSizeChange(e) {
    const sizeValue = e.target.value;
    const block = e.target.closest(".layout-block");
    const sizeDisplay = block.querySelector(".size-value");
    const content = block.querySelector(".block-content");

    // Update the size display
    sizeDisplay.textContent = `${sizeValue}px`;

    // Update the content font size
    content.style.fontSize = `${sizeValue}px`;

    updateSliderVisual(e.target, sizeValue);

    // Adjust line height based on font size
    const lineHeight = Math.max(
      1.2,
      Math.min(1.8, 1.6 - (sizeValue - 16) * 0.005)
    );
    //content.style.lineHeight = lineHeight;
  }

  /**
   * Handle font style dropdown change
   * @param {Event} e - Change event
   */
  handleStyleChange(e) {
    const dropdown = e.target;
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const block = dropdown.closest(".layout-block");
    const content = block.querySelector(".block-content");

    // Apply the selected style
    this.applyFontStyle(content, selectedOption);
  }

  /**
   * Handle column layout dropdown change
   * @param {Event} e - Change event
   */
  handleColumnsChange(e) {
    const dropdown = e.target;
    const columns = dropdown.value;
    const block = dropdown.closest(".layout-block");
    // Update the data-columns attribute
    block.setAttribute("data-columns", columns);
  }

  /**
   * Clone a layout block
   * @param {Event} e - Click event
   */
  cloneBlock(e) {
    const block = e.target.closest(".layout-block");

    // IMPORTANT: Store the selected value and index BEFORE cloning
    const originalStyleDropdown = block.querySelector(".style-dropdown");
    const originalColumnsDropdown = block.querySelector(".columns-dropdown");
    const selectedIndex = originalStyleDropdown
      ? originalStyleDropdown.selectedIndex
      : 0;
    const selectedColumn = originalColumnsDropdown ? originalColumnsDropdown.selectedIndex : 0;

    // Also store font styling info from the original content
    const originalContent = block.querySelector(".block-content");
    const originalFontStyles = {
      fontFamily: originalContent.style.fontFamily,
      fontSize: originalContent.style.fontSize,
      fontWeight: originalContent.style.fontWeight,
      fontStyle: originalContent.style.fontStyle,
      lineHeight: originalContent.style.lineHeight,
    };

    // Store the selected value and index BEFORE cloning
    const selectedColumns = block.getAttribute("data-columns") || "1";

    // Clone the block
    const clone = block.cloneNode(true);

    // Generate a unique ID for the clone
    const uniqueId = Date.now().toString();
    clone.id = `layout-block-${uniqueId}`;

    // Make sure the remove button is enabled
    const removeButton = clone.querySelector(".remove-button");
    removeButton.disabled = false;

    // Insert after the original block
    block.parentNode.insertBefore(clone, block.nextSibling);

    // CRITICAL STEP: We need to first attach events to the clone
    // so that the style dropdown has its change event handler
    this.attachEventsToBlock(clone);

    // Now handle the style dropdown
    const clonedStyleDropdown = clone.querySelector(".style-dropdown");
    if (clonedStyleDropdown) {
      clonedStyleDropdown.selectedIndex = selectedIndex;
    }
    const clonedColumnDropdown = clone.querySelector(".columns-dropdown");
    if (clonedColumnDropdown) {
      clonedColumnDropdown.selectedIndex = selectedColumn;
    }

    // Update the cloned block's columns attribute
    clone.setAttribute("data-columns", selectedColumns);

    // Apply the stored font styles directly to ensure they match the original
    const clonedContent = clone.querySelector(".block-content");
    if (clonedContent) {
      Object.assign(clonedContent.style, originalFontStyles);
    }
  }

  /**
   * Remove a layout block
   * @param {Event} e - Click event
   */
  removeBlock(e) {
    const button = e.target;
    if (button.disabled) return;

    const block = button.closest(".layout-block");
    block.parentNode.removeChild(block);
  }

  /**
   * Attach events to a specific block
   * @param {HTMLElement} block - The layout block
   */
  attachEventsToBlock(block) {
    // Size slider - make sure we're targeting both possible class names
    const slider = block.querySelector(".master-slider");
    if (slider) {
      // Remove existing event listeners to prevent duplicates
      const newSlider = slider.cloneNode(true);
      slider.parentNode.replaceChild(newSlider, slider);
      newSlider.addEventListener("input", (e) => this.handleSizeChange(e));
    }

    // Style dropdown - update this to handle the new custom dropdown
    const variantDropdown = block.querySelector('.variantDropdown');
    if (variantDropdown) {
      // Remove existing event listeners to prevent duplicates
      const newDropdown = variantDropdown.cloneNode(true);
      variantDropdown.parentNode.replaceChild(newDropdown, variantDropdown);
      // Set up the custom dropdown events
      this.setupVariantDropdown(newDropdown);
    }

    // Column dropdown
    const columnsDropdown = block.querySelector(".columnsDropdown");
    if (columnsDropdown) {
      // Remove existing event listeners to prevent duplicates
      const newDropdown = columnsDropdown.cloneNode(true);
      columnsDropdown.parentNode.replaceChild(newDropdown, columnsDropdown);
      // Set up the custom dropdown events
      this.setupColumnsDropdown(newDropdown);
    }

    // Clone button
    const cloneBtn = block.querySelector(".clone-button");
    if (cloneBtn) {
      // Remove existing event listeners to prevent duplicates
      const newBtn = cloneBtn.cloneNode(true);
      cloneBtn.parentNode.replaceChild(newBtn, cloneBtn);
      newBtn.addEventListener("click", (e) => this.cloneBlock(e));
    }

    // Remove button
    const removeBtn = block.querySelector(".remove-button");
    if (removeBtn) {
      // Remove existing event listeners to prevent duplicates
      const newBtn = removeBtn.cloneNode(true);
      removeBtn.parentNode.replaceChild(newBtn, removeBtn);
      newBtn.addEventListener("click", (e) => this.removeBlock(e));
    }
  }

  /**
   * Select the Regular (400) option in a dropdown if available, otherwise select the first option
   * @param {HTMLSelectElement} dropdown - The dropdown to set selection in
   */
  selectRegularOption(dropdown) {
    if (!dropdown || dropdown.options.length === 0) return;

    // Try to find and select the Regular (400) option first
    let regularIndex = -1;

    // Look for the Regular option
    for (let i = 0; i < dropdown.options.length; i++) {
      const option = dropdown.options[i];
      if (
        option.dataset.weight === "400" &&
        option.dataset.style === "normal"
      ) {
        regularIndex = i;
        break;
      }
    }

    // Set the selected index to Regular if found, otherwise use the first option
    dropdown.selectedIndex = regularIndex >= 0 ? regularIndex : 0;

    // Apply the selected style to the content
    const block = dropdown.closest(".layout-block");
    if (block) {
      const content = block.querySelector(".block-content");
      const selectedOption = dropdown.options[dropdown.selectedIndex];
      this.applyFontStyle(content, selectedOption);
    }
  }

  /**
   * Modifies the HTML structure to center the control groups
   * Usage: Call this after all control groups are populated
   */
  reorganizeControlLayout() {
    document.querySelectorAll('.layout-block').forEach(block => {
      const controls = block.querySelector('.block-controls');
      const fontName = block.querySelector('.block-font-name');
      const buttonGroup = block.querySelector('.button-group');
      
      // Get all control groups
      const controlGroups = Array.from(controls.querySelectorAll('.control-group, .variantDropdown, .columnsDropdown'));
      
      // If we already have the wrapper, we don't need to reorganize
      if (controls.querySelector('.controls-center')) return;
      
      // Create a center container for the controls
      const centerContainer = document.createElement('div');
      centerContainer.className = 'controls-center';
      
      // Move the control groups to the center container
      controlGroups.forEach(group => {
        centerContainer.appendChild(group);
      });
      
      // Clear and rebuild the controls container
      while (controls.firstChild) {
        controls.removeChild(controls.firstChild);
      }
      
      // Add back the elements in the right order
      controls.appendChild(fontName);
      controls.appendChild(centerContainer);
      controls.appendChild(buttonGroup);
    });
  }
}



// Initialize when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Create the layout manager
  window.layoutManager = new TypographyLayoutManager();
});
