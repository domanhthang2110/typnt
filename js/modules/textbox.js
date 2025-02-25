import { updateSettingsPanel } from './font-manager.js';
import { updateFontCardSelection } from './font-manager.js';


const STATE = {
    DEFAULT: 'default',
    SELECTED: 'selected',
    EDITING: 'editing'
};

// Global state
const state = {
    playground: null,
    activeTextbox: null,
    textboxes: new Map()
};

// Create a new textbox
function createTextbox(type) {
    const content = type === 'paragraph' ? 'Double click to edit' : 'Text';
    const element = $(`
        <div class="textbox ${type === 'paragraph' ? 'textbox--paragraph' : ''}">
            <div class="textbox__content" contenteditable="false" spellcheck="false">
                ${content}
            </div>
            <div class="textbox__resize-handle"></div>
        </div>
    `);

    // Set minimal initial styles
    const styles = {
        family: 'inherit',
        size: '32px',
        features: {},  // empty by default
        axis: {},     // empty by default
        instance: 'Regular'
    };
    
    applyStyles(element, styles);
    setupInteractions(element, type, styles);
    
    // Add to playground and store reference
    state.playground.append(element);
    state.textboxes.set(element[0], { element, type, styles });
    
    // Position the new textbox and set dimensions
    const initialStyles = {
      position: "absolute", // Add this line
      top: "20%",
      left: "20%",
    };

    // Add width for non-paragraph textboxes
    if (type !== 'paragraph') {
        initialStyles.width = 'fit-content';  // Make it fit the content
        initialStyles.whiteSpace = 'nowrap';  // Prevent wrapping
    }

    element.css(initialStyles);
    
    setTextboxState(element, STATE.SELECTED);
    state.activeTextbox = element[0];
    
    return element;
}

// Only apply what's explicitly set
function applyStyles(element, styles) {
    const content = element.find('.textbox__content');
    const cssStyles = {
      "font-family": styles.family || "inherit",
      "font-size": styles.size || "16px",
    };

    // Apply OpenType features
    if (styles.features && Object.keys(styles.features).length > 0) {
        cssStyles['font-feature-settings'] = Object.entries(styles.features)
            .map(([feature, value]) => `"${feature}" ${value ? 1 : 0}`)
            .join(', ');
    }

    // Apply variable font settings
    if (styles.axis && Object.keys(styles.axis).length > 0) {
        cssStyles['font-variation-settings'] = Object.entries(styles.axis)
            .map(([axis, value]) => `"${axis}" ${value}`)
            .join(', ');
    }

    content.css(cssStyles);
    console.log('Applied styles:', cssStyles);
}

function setupInteractions(element, type, styles) {
    // Make draggable
    element.draggable({
        containment: '.playground',
        start: () => {
            $('.textbox').not(element).removeClass('textbox--focused');
            element.addClass('textbox--focused');
        }
    });

    // Make resizable if paragraph
    if (type === 'paragraph') {
        element.resizable({
            handles: "n, e, s, w, ne, nw, se, sw",
            minWidth: 100,
            minHeight: 50,
            maxWidth: 1000,
            maxHeight: 500,
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
    const handle = element.find('.textbox__resize-handle');
    handle.on('mousedown', (e) => {
        e.preventDefault();
        element.draggable('disable');
        
        const textboxData = state.textboxes.get(element[0]);
        if (!textboxData) return;
        
        const initialY = e.clientY;
        // Get current size from textbox data instead of initial styles
        const initialSize = parseInt(textboxData.styles.size);

        function handleMouseMove(e) {
            const deltaY = e.clientY - initialY;
            const newSize = Math.min(400, Math.max(12, initialSize + deltaY / 2));
            
            // Update only the size while preserving other styles
            textboxData.styles = {
                ...textboxData.styles,
                size: `${newSize}px`
            };
            applyStyles(element, textboxData.styles);
        }

        function handleMouseUp() {
            $(document).off("mousemove", handleMouseMove);
            $(document).off("mouseup", handleMouseUp);
            element.draggable("enable");
            setTimeout(() => {
                setTextboxState(element, STATE.SELECTED);
            }, 0);
        }
        $(document).on('mousemove', handleMouseMove);
        $(document).on('mouseup', handleMouseUp);
    });
}

function setTextboxState(element, newState) {
    // First, deselect all other textboxes if this one is being selected
    if (newState === STATE.SELECTED) {
        state.textboxes.forEach((data, el) => {
            if (el !== element[0]) {
                $(el).removeClass('textbox--selected textbox--editing textbox--hover');
            }
        });
    }

    // Then set the state for this textbox
    element
        .removeClass('textbox--selected textbox--editing textbox--hover')
        .addClass(`textbox--${newState}`);

    const content = element.find('.textbox__content');
    content.attr('contenteditable', newState === STATE.EDITING);

    if (newState === STATE.EDITING) {
        element.draggable('disable');
        content.focus();
    } else {
        element.draggable('enable');
    }

    if (newState === STATE.SELECTED) {
        state.activeTextbox = element[0];
        // Dispatch event when textbox is selected
        const textboxData = state.textboxes.get(element[0]);
        if (textboxData) {
            const event = new CustomEvent('textbox-selected', {
                detail: {
                    textbox: element[0],
                    styles: textboxData.styles
                }
            });
            document.dispatchEvent(event);
        }
    }
}

// Initialize everything
function init(playgroundSelector) {
    state.playground = $(playgroundSelector);
    
    // Fix the font-selected event listener
    document.addEventListener('font-selected', (e) => {
        if (!state.activeTextbox) return;
        
        const { fontData, fontInfo } = e.detail;  // Get both fontData and fontInfo
        const textboxData = state.textboxes.get(state.activeTextbox);
        
        if (textboxData) {
            // Update styles
            textboxData.styles = {
                ...textboxData.styles,
                ...fontData
            };
            applyStyles(textboxData.element, textboxData.styles);

            // Update settings panel with current textbox settings
            updateSettingsPanel({
                features: fontInfo.availableFeatures,
                axes: fontInfo.availableAxes,
                instances: fontInfo.availableInstances,
                // Current textbox settings
                currentFeatures: textboxData.styles.features || {},
                currentAxes: textboxData.styles.axis || {},
                currentInstance: textboxData.styles.instance || 'Regular'
            });
        }
    });

    // Setup global event listeners
    $('#add-text').on('click', () => createTextbox('text'));
    $('#add-paragraph').on('click', () => createTextbox('paragraph'));
    $('#delete-textbox').on('click', deleteActiveTextbox);

    state.playground
        .on('click', (e) => {
            if (
              $(e.target).hasClass("playground__grid") ||
              $(e.target).hasClass("playground")
            ) {
              clearSelection();
              
            }
        })
        .on('dblclick', '.textbox', (e) => {
            setTextboxState($(e.currentTarget), STATE.EDITING);
            state.activeTextbox = e.currentTarget;
        })
        .on('mousedown', '.textbox', (e) => {
            if (e.target.closest('.textbox__content[contenteditable="true"]')) return;
            
            setTextboxState($(e.currentTarget), STATE.SELECTED);
            state.activeTextbox = e.currentTarget;
        });
}

function clearSelection() {
  // Clear all textbox selections
  state.textboxes.forEach((data, element) => {
    setTextboxState($(element), STATE.DEFAULT);
  });
  state.activeTextbox = null;

  // Clear font card selection by passing null
  updateFontCardSelection(null);

  // Clear settings panel when no textbox is selected
  updateSettingsPanel({
    features: [],
    axes: {},
    instances: [],
    currentFeatures: {},
    currentAxes: {},
    currentInstance: "Regular",
  });
}

function deleteActiveTextbox() {
    if (!state.activeTextbox) return;
    
    $(state.activeTextbox).remove();
    state.textboxes.delete(state.activeTextbox);
    state.activeTextbox = null;

    // Clear settings panel when textbox is deleted
    updateSettingsPanel({
        features: [],
        axes: {},
        instances: [],
        currentFeatures: {},
        currentAxes: {},
        currentInstance: 'Regular'
    });
}

export { init, createTextbox, deleteActiveTextbox, applyStyles, state };