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

    // Set initial styles
    const styles = {
        family: 'inherit',
        size: '16px',
        features: {}
    };
    
    applyStyles(element, styles);
    setupInteractions(element, type, styles);
    
    // Add to playground and store reference
    state.playground.append(element);
    state.textboxes.set(element[0], { element, type, styles });
    
    // Position the new textbox
    element.css({ top: '20%', left: '20%' });
    
    setTextboxState(element, STATE.SELECTED);
    state.activeTextbox = element[0];
    
    return element;
}

function applyStyles(element, styles) {
    const content = element.find('.textbox__content');
    content.css({
        'font-family': `"${styles.family}"`,
        'font-size': styles.size,
        'font-feature-settings': Object.entries(styles.features)
            .map(([feature, value]) => `"${feature}" ${value}`)
            .join(', ') || 'normal'
    });
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
            handles: 'n, e, s, w, ne, nw, se, sw',
            minWidth: 100,
            minHeight: 50,
            maxWidth: 1000,
            maxHeight: 500,
            borderless: true,
            containment: '.playground',
            start: () => setTextboxState(element, STATE.SELECTED),
            stop: () => setTextboxState(element, STATE.SELECTED)
        });
    }

    // Setup font size handle
    const handle = element.find('.textbox__resize-handle');
    handle.on('mousedown', (e) => {
        e.preventDefault();
        element.draggable('disable');
        
        const initialY = e.clientY;
        const initialSize = parseInt(styles.size);

        function handleMouseMove(e) {
            const deltaY = e.clientY - initialY;
            const newSize = Math.min(400, Math.max(12, initialSize + deltaY / 2));
            styles.size = `${newSize}px`;
            applyStyles(element, styles);
        }

        function handleMouseUp() {
            $(document).off('mousemove', handleMouseMove);
            $(document).off('mouseup', handleMouseUp);
            element.draggable('enable');
        }

        $(document).on('mousemove', handleMouseMove);
        $(document).on('mouseup', handleMouseUp);
    });
}

function setTextboxState(element, newState) {
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
}

// Initialize everything
function init(playgroundSelector) {
    state.playground = $(playgroundSelector);
    
    // Setup global event listeners
    $('#add-text').on('click', () => createTextbox('text'));
    $('#add-paragraph').on('click', () => createTextbox('paragraph'));
    $('#delete-textbox').on('click', deleteActiveTextbox);

    state.playground
        .on('click', (e) => {
            if (!$(e.target).closest('.textbox').length) {
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
    state.textboxes.forEach((data, element) => {
        setTextboxState($(element), STATE.DEFAULT);
    });
    state.activeTextbox = null;
}

function deleteActiveTextbox() {
    if (!state.activeTextbox) return;
    
    $(state.activeTextbox).remove();
    state.textboxes.delete(state.activeTextbox);
    state.activeTextbox = null;
}

export { init, createTextbox, deleteActiveTextbox };