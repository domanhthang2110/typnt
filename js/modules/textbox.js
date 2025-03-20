import {
  updateSettingsPanel,
  updateFontCardSelection,
  updateFontSizeSlider,
  getSelectedFontData,
  showUserManual
} from "./font-manager.js";

const STATE = {
  DEFAULT: "default",
  SELECTED: "selected",
  EDITING: "editing",
};

// Global state
const state = {
  playground: null,
  activeTextbox: null,
  textboxes: new Map(),
  lastSave: null, // Track when we last saved
};

// Add session storage key constant
const SESSION_STORAGE_KEY = 'typelab_session_textbox_data';

// Create a new textbox
function createTextbox(type, customData = null) {
  const content =
    type === "paragraph"
      ? "Typelab is an interactive learning platform designed for typography enthusiasts, students, and professionals. It offers a structured approach to learning, practicing, and applying typography knowledge."
      : "Typelab";
  
  // Allow creating with custom data for loading from storage
  const element = $(`
    <div class="textbox ${type === "paragraph" ? "textbox--paragraph" : ""}">
        <div class="textbox__content" contenteditable="false" spellcheck="false">
            ${customData ? customData.content : content}
        </div>
        <div class="textbox__guide-line"></div>
        <div class="textbox__resize-handle"></div>
    </div>
  `);
  
  const size = customData ? customData.styles.size : (type === "paragraph" ? "18px" : "32px");

  // Get styles from customData if available, otherwise use selected font
  let styles;
  if (customData && customData.styles) {
    // Use the saved styles directly and make sure to keep all properties
    styles = { ...customData.styles };
    console.log("Using saved styles:", styles);
  } else {
    // Get the current selected font data if creating a new textbox
    const selectedFontData = getSelectedFontData();
    console.log("Selected font data for new textbox:", selectedFontData);
    
    styles = {
      family: selectedFontData?.family || "inherit",
      size: size,
      features: selectedFontData?.features || {},
      axis: selectedFontData?.axes || {},
      instance: selectedFontData?.instance || "Regular",
      instanceData: selectedFontData?.instanceData || {},
      textAlign: selectedFontData?.textAlign || "left",
      italic: selectedFontData?.italic || false,
      underline: selectedFontData?.underline || false
    };
  }

  applyStyles(element, styles);
  setupInteractions(element, type, styles);

  // Add to playground and store reference
  state.playground.append(element);
  state.textboxes.set(element[0], { element, type, styles });

  // Position the textbox
  if (customData) {
    // Use the saved position and dimensions, but handle regular textboxes differently
    if (type === "paragraph") {
      // For paragraph textboxes, use all saved dimensions
      element.css({
        position: "absolute",
        top: customData.position.top,
        left: customData.position.left,
        width: customData.dimensions.width,
        height: customData.dimensions.height
      });
    } else {
      // For regular textboxes, don't set fixed height - let it scale with content
      element.css({
        position: "absolute",
        top: customData.position.top,
        left: customData.position.left,
        width: customData.dimensions.width,
        height: "auto", // Allow height to adjust to content
        whiteSpace: "nowrap" // Keep text on a single line
      });
      
      // Force fit-content to ensure proper width scaling
      setTimeout(() => {
        element.css({
          width: "fit-content"
        });
      }, 0);
    }
  } else {
    // Default positioning for new textboxes
    const initialStyles = {
      position: "absolute",
      top: "20%",
      left: "20%",
    };

    // Add width for non-paragraph textboxes
    if (type !== "paragraph") {
      initialStyles.width = "fit-content";
      initialStyles.whiteSpace = "nowrap";
    }

    element.css(initialStyles);
  }

  setTextboxState(element, STATE.SELECTED);
  state.activeTextbox = element[0];

  // Save after creating a new textbox
  saveTextboxesToStorage();

  return element;
}

// Only apply what's explicitly set
function applyStyles(element, styles) {
  const content = element.find(".textbox__content");
  const cssStyles = {
    "font-family": styles.family || "inherit",
    "font-size": styles.size || "18px",
    // Add text formatting styles
    "text-align": styles.textAlign || "left",
    "font-style": styles.italic ? "italic" : "normal",
    "text-decoration": styles.underline ? "underline" : "none"
  };

  // Apply styles first
  content.css(cssStyles);

  // Add extra padding for italic text in non-paragraph textboxes
  const isNonParagraph = !element.hasClass("textbox--paragraph");
    // Add padding to account for italic slant
    const extraPadding = styles.italic ? '0.2em' : '0';
    content.css({
      'padding-right': extraPadding
    });
    if (isNonParagraph) {
    // Force width recalculation for fit-content
    element.css({
      width: 'fit-content'
    });
  }

  // Apply OpenType features
  if (styles.features && Object.keys(styles.features).length > 0) {
    cssStyles["font-feature-settings"] = Object.entries(styles.features)
      .map(([feature, value]) => `"${feature}" ${value ? 1 : 0}`)
      .join(", ");
  }

  // Apply variable font settings
  if (styles.axis && Object.keys(styles.axis).length > 0) {
    cssStyles["font-variation-settings"] = Object.entries(styles.axis)
      .map(([axis, value]) => `"${axis}" ${value}`)
      .join(", ");
  }

  // Handle font weight using jQuery css method
  if (styles.axis && styles.axis.wght) {
    cssStyles["font-weight"] = styles.axis.wght;
    console.log("Weight adjusted from axis");
  }

  // If using an instance that affects weight
  if (styles.instanceData && styles.instanceData.wght) {
    cssStyles["font-weight"] = styles.instanceData.wght;
    console.log("Weight adjusted from instance");
  }

  content.css(cssStyles);
  console.log("Applied styles:", cssStyles);
}

function setupInteractions(element, type, styles) {
  // Make draggable
  element.draggable({
    containment: ".playground",
    start: () => {
      $(".textbox").not(element).removeClass("textbox--focused");
      element.addClass("textbox--focused");
    },
  });

  // Make resizable if paragraph
  if (type === "paragraph") {
    element.resizable({
      handles: "n, e, s, w, ne, nw, se, sw",
      minWidth: 100,
      minHeight: 50,
      borderless: true,
      containment: ".playground",
      start: function (event, ui) {
        event.stopPropagation();
        setTextboxState($(this), STATE.SELECTED);
      },
      resize: function (event, ui) {
        event.stopPropagation();
      },
      stop: function (event, ui) {
        // Ensure the textbox stays selected after a short delay
        setTimeout(() => {
          setTextboxState($(this), STATE.SELECTED);
        }, 0);
      },
    });
  }

  // Setup font size handle
  const handle = element.find(".textbox__resize-handle");
  handle.on("mousedown", (e) => {
    e.preventDefault();
    element.draggable("disable");

    const textboxData = state.textboxes.get(element[0]);
    if (!textboxData) return;

    const initialY = e.clientY;
    const initialSize = parseInt(textboxData.styles.size);

    function handleMouseMove(e) {
      const deltaY = e.clientY - initialY;
      const newSize = Math.min(400, Math.max(12, initialSize + deltaY / 2));

      // Update textbox styles
      textboxData.styles = {
        ...textboxData.styles,
        size: `${newSize}px`,
      };
      applyStyles(element, textboxData.styles);

      // Sync with settings panel slider
      updateFontSizeSlider(newSize);
    }

    function handleMouseUp() {
      $(document).off("mousemove", handleMouseMove);
      $(document).off("mouseup", handleMouseUp);
      element.draggable("enable");
      setTimeout(() => {
        setTextboxState(element, STATE.SELECTED);
      }, 0);
    }
    $(document).on("mousemove", handleMouseMove);
    $(document).on("mouseup", handleMouseUp);
  });
}

function setTextboxState(element, newState) {
  // First, deselect all other textboxes if this one is being selected
  if (newState === STATE.SELECTED) {
    state.textboxes.forEach((data, el) => {
      if (el !== element[0]) {
        $(el).removeClass("textbox--selected textbox--editing textbox--hover");
      }
    });
  }

  // Then set the state for this textbox
  element
    .removeClass("textbox--selected textbox--editing textbox--hover")
    .addClass(`textbox--${newState}`);

  const content = element.find(".textbox__content");
  content.attr("contenteditable", newState === STATE.EDITING);

  if (newState === STATE.EDITING) {
    element.draggable("disable");
    content.focus();
  } else {
    element.draggable("enable");
  }

  if (newState === STATE.SELECTED) {
    state.activeTextbox = element[0];
    // Dispatch event when textbox is selected
    const textboxData = state.textboxes.get(element[0]);
    if (textboxData) {
      const event = new CustomEvent("textbox-selected", {
        detail: {
          textbox: element[0],
          styles: textboxData.styles,
        },
      });
      document.dispatchEvent(event);
    }
  }
}

// Add functions to serialize and deserialize textbox data
function serializeTextboxes() {
  const textboxData = [];
  
  state.textboxes.forEach((data, element) => {
    const $el = $(element);
    const content = $el.find('.textbox__content').text();
    
    // Get position
    const position = {
      top: $el.css('top'),
      left: $el.css('left')
    };
    
    // Get dimensions
    const dimensions = {
      width: $el.css('width'),
      height: $el.css('height')
    };
    
    textboxData.push({
      type: data.type,
      content: content,
      position: position,
      dimensions: dimensions,
      styles: data.styles
    });
  });
  
  return textboxData;
}

// Save textboxes to sessionStorage only
function saveTextboxesToStorage() {
  if (state.textboxes.size === 0) {
    // Clear storage if no textboxes
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  
  try {
    const data = serializeTextboxes();
    
    // Save to sessionStorage only
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    
    state.lastSave = new Date();
    
    // Show temporary save indicator
    showSaveIndicator();
    
    console.log('Textboxes saved to session storage:', data);
  } catch (error) {
    console.error('Error saving textboxes to session storage:', error);
  }
}

// Load textboxes from sessionStorage only
function loadTextboxesFromStorage() {
  try {
    const savedData = sessionStorage.getItem(SESSION_STORAGE_KEY);
    
    if (!savedData) return false;
    
    const textboxes = JSON.parse(savedData);
    console.log('Loading textboxes from session storage:', textboxes);
    
    // Clear any existing textboxes
    state.textboxes.forEach((data, element) => {
      $(element).remove();
    });
    state.textboxes.clear();
    
    // Create each saved textbox but don't select any of them
    textboxes.forEach(textboxData => {
      // Use a modified version of createTextbox that doesn't select
      createTextboxWithoutSelecting(textboxData.type, textboxData);
    });
    
    // Clear active textbox - nothing should be selected initially
    state.activeTextbox = null;
    
    return true;
  } catch (error) {
    console.error('Error loading textboxes from session storage:', error);
    return false;
  }
}

// Create a textbox without selecting it (for use when loading from storage)
function createTextboxWithoutSelecting(type, customData) {
  const content =
    type === "paragraph"
      ? "Typelab is an interactive learning platform designed for typography enthusiasts, students, and professionals. It offers a structured approach to learning, practicing, and applying typography knowledge."
      : "Typelab";
  
  // Allow creating with custom data for loading from storage
  const element = $(`
    <div class="textbox ${type === "paragraph" ? "textbox--paragraph" : ""}">
        <div class="textbox__content" contenteditable="false" spellcheck="false">
            ${customData ? customData.content : content}
        </div>
        <div class="textbox__guide-line"></div>
        <div class="textbox__resize-handle"></div>
    </div>
  `);
  
  const size = customData ? customData.styles.size : (type === "paragraph" ? "18px" : "32px");

  // Get styles from customData if available, otherwise use selected font
  let styles;
  if (customData && customData.styles) {
    // Use the saved styles directly and make sure to keep all properties
    styles = { ...customData.styles };
  } else {
    // Get the current selected font data if creating a new textbox
    const selectedFontData = getSelectedFontData();
    
    styles = {
      family: selectedFontData?.family || "inherit",
      size: size,
      features: selectedFontData?.features || {},
      axis: selectedFontData?.axes || {},
      instance: selectedFontData?.instance || "Regular",
      instanceData: selectedFontData?.instanceData || {},
      textAlign: selectedFontData?.textAlign || "left",
      italic: selectedFontData?.italic || false,
      underline: selectedFontData?.underline || false
    };
  }

  applyStyles(element, styles);
  setupInteractions(element, type, styles);

  // Add to playground and store reference
  state.playground.append(element);
  state.textboxes.set(element[0], { element, type, styles });

  // Position the textbox
  if (customData) {
    // Use the saved position and dimensions, but handle regular textboxes differently
    if (type === "paragraph") {
      // For paragraph textboxes, use all saved dimensions
      element.css({
        position: "absolute",
        top: customData.position.top,
        left: customData.position.left,
        width: customData.dimensions.width,
        height: customData.dimensions.height
      });
    } else {
      // For regular textboxes, don't set fixed height - let it scale with content
      element.css({
        position: "absolute",
        top: customData.position.top,
        left: customData.position.left,
        width: customData.dimensions.width,
        height: "auto", // Allow height to adjust to content
        whiteSpace: "nowrap" // Keep text on a single line
      });
      
      // Force fit-content to ensure proper width scaling
      setTimeout(() => {
        element.css({
          width: "fit-content"
        });
      }, 0);
    }
  } else {
    // Default positioning for new textboxes
    const initialStyles = {
      position: "absolute",
      top: "20%",
      left: "20%",
    };

    // Add width for non-paragraph textboxes
    if (type !== "paragraph") {
      initialStyles.width = "fit-content";
      initialStyles.whiteSpace = "nowrap";
    }

    element.css(initialStyles);
  }

  // The key difference: Set state to DEFAULT instead of SELECTED
  setTextboxState(element, STATE.DEFAULT);
  
  // No need to save after loading
  return element;
}

// Shows a brief save indicator
function showSaveIndicator() {
  // Check if the indicator already exists
  let indicator = document.querySelector('.save-indicator');
  
  if (!indicator) {
    // Create indicator if it doesn't exist
    indicator = document.createElement('div');
    indicator.className = 'save-indicator';
    document.body.appendChild(indicator);
  }
  
  // Update indicator text
  indicator.textContent = 'Layout saved';
  
  // Show the indicator
  indicator.classList.add('active');
  
  // Hide after delay
  setTimeout(() => {
    indicator.classList.remove('active');
  }, 1500);
}

// Simplify the debouncedSave function (no longer needs an isSessionSave parameter)
function debouncedSave() {
  clearTimeout(state.saveTimeout);
  state.saveTimeout = setTimeout(() => {
    saveTextboxesToStorage();
  }, 500);
}

// Initialize everything
function init(playgroundSelector) {
  state.playground = $(playgroundSelector);

  // Add save indicator styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .save-indicator {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--accent-color);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s, transform 0.3s;
      z-index: 1000;
      pointer-events: none;
    }
    
    .save-indicator.active {
      opacity: 0.9;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(styleElement);

  // Fix the font-selected event listener
  document.addEventListener("font-selected", (e) => {
    if (!state.activeTextbox) return;

    const { fontData, fontInfo } = e.detail; // Get both fontData and fontInfo
    const textboxData = state.textboxes.get(state.activeTextbox);

    if (textboxData) {
      // Update styles
      textboxData.styles = {
        ...textboxData.styles,
        ...fontData,
      };
      applyStyles(textboxData.element, textboxData.styles);

      // Update settings panel with current textbox settings
      updateSettingsPanel({
        size: textboxData.styles.size,
        features: fontInfo.availableFeatures,
        axes: fontInfo.availableAxes,
        instances: fontInfo.availableInstances,
        // Current textbox settings
        currentFeatures: textboxData.styles.features || {},
        currentAxes: textboxData.styles.axis || {},
        currentInstance: textboxData.styles.instance,
      });
    }
  });

  // Add format change listener
  document.addEventListener("settings-changed", (e) => {
    if (!state.activeTextbox) return;

    const { type, format, value } = e.detail;
    const textboxData = state.textboxes.get(state.activeTextbox);

    if (textboxData && type === 'format') {
      switch (format) {
        case 'align':
          textboxData.styles.textAlign = value;
          break;
        case 'italic':
          textboxData.styles.italic = value;
          break;
        case 'underline':
          textboxData.styles.underline = value;
          break;
      }

      applyStyles(textboxData.element, textboxData.styles);
    }
  });

  // Setup global event listeners
  $("#add-text").on("click", () => {
    createTextbox("text");
    debouncedSave();
  });
  
  $("#add-paragraph").on("click", () => {
    createTextbox("paragraph");
    debouncedSave();
  });
  
  $("#delete-textbox").on("click", () => {
    deleteActiveTextbox();
    debouncedSave();
  });

  state.playground
    .on("click", (e) => {
      if (
        $(e.target).hasClass("playground__grid") ||
        $(e.target).hasClass("playground")
      ) {
        clearSelection();
      }
    })
    .on("dblclick", ".textbox", (e) => {
      // Exit editing mode for any other textbox first
      state.textboxes.forEach((data, el) => {
        if (el !== e.currentTarget) {
          setTextboxState($(el), STATE.DEFAULT);
        }
      });
      
      setTextboxState($(e.currentTarget), STATE.EDITING);
      state.activeTextbox = e.currentTarget;
    })
    .on("mousedown", ".textbox", (e) => {
      const clickedTextbox = $(e.currentTarget);
      
      // Early return if clicking anywhere in or on an editing textbox
      if (clickedTextbox.hasClass("textbox--editing") || 
          clickedTextbox.find('.textbox__content[contenteditable="true"]').length) {
          e.stopPropagation();
          return;
      }

      // Only proceed with state changes if we're clicking a non-editing textbox
      if (!clickedTextbox.hasClass("textbox--editing")) {
          // If clicking a different textbox while one is in editing mode
          const currentlyEditing = state.textboxes
              .get(state.activeTextbox)
              ?.element.hasClass("textbox--editing");
          if (currentlyEditing && state.activeTextbox !== e.currentTarget) {
              setTextboxState($(state.activeTextbox), STATE.DEFAULT);
          }

          setTextboxState(clickedTextbox, STATE.SELECTED);
          state.activeTextbox = e.currentTarget;
      }
    });

  // Add keyboard event listener for delete key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && state.activeTextbox) {
      deleteActiveTextbox();
    }
  });

  // Add mutation observer to track content changes
  const mutationObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData' || 
          mutation.type === 'childList' ||
          (mutation.type === 'attributes' && 
           (mutation.attributeName === 'style' || 
            mutation.attributeName === 'class'))) {
        debouncedSave();
      }
    });
  });
  
  // Start observing the playground
  mutationObserver.observe(state.playground[0], {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // Try to load saved textboxes
  const loaded = loadTextboxesFromStorage();
  
  if (loaded) {
    // Show user manual when textboxes are loaded but none selected
    showUserManual();
  } else {
    // Create default textbox if no saved data
    createTextbox("text");
  }
}

function clearSelection() {
  // Exit editing mode for any textbox
  state.textboxes.forEach((data, element) => {
    if ($(element).hasClass('textbox--editing')) {
      setTextboxState($(element), STATE.DEFAULT);
    }
  });
  
  // Rest of the existing clearSelection code...
  updateSettingsPanel({
    size: null,
    features: [],
    axes: {},
    instances: [],
    currentFeatures: {},
    currentAxes: {},
    currentInstance: "Regular",
  });
  state.textboxes.forEach((data, element) => {
    setTextboxState($(element), STATE.DEFAULT);
  });
  state.activeTextbox = null;
  showUserManual();

  // Save state after clearing selection
  debouncedSave();
}

function deleteActiveTextbox() {
  if (!state.activeTextbox) return;

  $(state.activeTextbox).remove();
  state.textboxes.delete(state.activeTextbox);
  state.activeTextbox = null;

  // Clear settings panel when textbox is deleted
  updateSettingsPanel({
    size: null,
    features: [],
    axes: {},
    instances: [],
    currentFeatures: {},
    currentAxes: {},
    currentInstance: {},
  });
  
  // Save after deleting
  debouncedSave();
}

export { 
  init, 
  createTextbox, 
  deleteActiveTextbox, 
  applyStyles, 
  state, 
  saveTextboxesToStorage,
  createTextboxWithoutSelecting // Add new export
};
