// State management
const state = {
    selectedTextBox: null,
    editingTextBox: null,
    fonts: new Map(),
    playground: null,
    fontListElement: null,
    fontInfoElement: null
};

// Text Box Functions
function initTextBoxManager(playgroundSelector) {
    state.playground = $(playgroundSelector);
    setupTextBoxEventListeners();
}

function setupTextBoxEventListeners() {
    $(document).on('click', (e) => {
        const clickedTextbox = $(e.target).closest('.textbox');
        const isControl = $(e.target).closest('#add-text, #add-paragraph, #delete-textbox').length > 0;
        
        if (!clickedTextbox.length && !isControl) {
            setUnselectedState();
        }
    });
}

function createTextBox(type) {
    const textbox = $(`
        <div class="textbox ${type === 'paragraph' ? 'textbox--paragraph' : ''}">
            <div class="textbox__content" contenteditable="false">
                ${type === 'paragraph' ? 'Lorem ipsum dolor sit amet...' : 'Text'}
            </div>
            <div class="textbox__resize-handle"></div>
        </div>
    `);
    
    state.playground.append(textbox);
    setupTextBoxStates(textbox, type);
    return textbox;
}

function setupTextBoxStates(textbox, type) {
    textbox.css({ top: '20%', left: '20%' });

    textbox.on('mouseenter mouseleave', () => {
        if (state.selectedTextBox !== textbox) {
            textbox.toggleClass('textbox--hover');
        }
    });

    textbox.on('click', (e) => {
        e.stopPropagation();
        setSelectedState(textbox);
    });

    textbox.on('dblclick', (e) => {
        e.stopPropagation();
        setEditState(textbox);
    });

    setupDraggable(textbox);
    if (type === 'paragraph') {
        setupResizable(textbox);
    }
    setupFontSizeHandle(textbox);
}

function setUnselectedState() {
    if (state.editingTextBox) {
        state.editingTextBox.find('.textbox__content').attr('contenteditable', 'false');
        state.editingTextBox = null;
    }
    $('.textbox').removeClass('textbox--selected textbox--editing');
    state.selectedTextBox = null;
}

function setSelectedState(textbox) {
    setUnselectedState();
    textbox.addClass('textbox--selected');
    state.selectedTextBox = textbox;
}

function setEditState(textbox) {
    if (state.selectedTextBox !== textbox) {
        setSelectedState(textbox);
    }
    textbox.addClass('textbox--editing');
    const content = textbox.find('.textbox__content');
    content.attr('contenteditable', 'true');
    content.focus();
    state.editingTextBox = textbox;
}

function deleteSelectedTextBox() {
    if (state.selectedTextBox) {
        state.selectedTextBox.remove();
        state.selectedTextBox = null;
    }
}

// Font Manager Functions
function initFontManager() {
    state.fontListElement = document.getElementById('font-list');
    state.fontInfoElement = document.getElementById('font-info');
    loadFontsFromDirectory('/fonts/');
}

async function loadFontsFromDirectory(directory) {
    try {
        const response = await fetch(directory);
        const dirList = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(dirList, 'text/html');
        
        const fontFiles = Array.from(doc.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href.match(/\.(ttf|otf|woff|woff2)$/i));

        for (const fontUrl of fontFiles) {
            const fontInfo = await loadFont(fontUrl);
            if (fontInfo) {
                createFontCard(fontInfo);
            }
        }
    } catch (error) {
        console.error('Error loading fonts directory:', error);
    }
}

// ... (Convert remaining FontManager methods to functions)

// Export functions that need to be accessed from outside
export {
    initTextBoxManager,
    initFontManager,
    createTextBox,
    deleteSelectedTextBox
};