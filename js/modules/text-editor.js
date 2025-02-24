/**
 * Represents text box states
 */
const TextBoxState = {
    DEFAULT: 'default',
    SELECTED: 'selected',
    EDITING: 'editing'
};

/**
 * Represents a single text box in the playground
 */
class TextBox {
    constructor(type, content) {
        this.type = type;
        this.content = content;
        this.state = TextBoxState.DEFAULT;
        this.fontSettings = {
            family: 'inherit',
            size: '16px',
            features: {}
        };
        this._createElement();
        this.setupInteractions();
    }

    _createElement() {
        this.element = $(`
            <div class="textbox ${this.type === 'paragraph' ? 'textbox--paragraph' : ''}">
                <div class="textbox__content" contenteditable="false" spellcheck="false">
                    ${this.content}
                </div>
                <div class="textbox__resize-handle"></div>
            </div>
        `);
        this.applyStyles();
    }

    applyStyles() {
        if (!this.element) return;
        const content = this.element.find('.textbox__content');
        content.css({
            'font-family': `"${this.fontSettings.family}"`,
            'font-size': this.fontSettings.size,
            'font-feature-settings': this._buildFeatureSettings()
        });
    }

    _buildFeatureSettings() {
        return Object.entries(this.fontSettings.features)
            .map(([feature, value]) => `"${feature}" ${value}`)
            .join(', ') || 'normal';
    }

    setState(newState) {
        this.state = newState;
        this._updateElementState();
    }

    _updateElementState() {
        const content = this.element.find('.textbox__content');
        
        this.element
            .removeClass('textbox--selected textbox--editing textbox--hover')
            .addClass(`textbox--${this.state}`);

        content.attr('contenteditable', this.state === TextBoxState.EDITING);

        if (this.state === TextBoxState.EDITING) {
            this.element.draggable('disable');
            content.focus();
        } else {
            this.element.draggable('enable');
        }
    }

    setupInteractions() {
        this.setupDraggable();
        if (this.type === 'paragraph') {
            this.setupResizable();
        }
        this.setupFontSizeHandle();
    }

    setupDraggable() {
        this.element.draggable({
            containment: '.playground',
            start: () => {
                $('.textbox').not(this.element).removeClass('textbox--focused');
                this.element.addClass('textbox--focused');
            }
        });
    }

    setupResizable() {
        this.element.resizable({
            handles: 'n, e, s, w, ne, nw, se, sw',
            minWidth: 100,
            minHeight: 50,
            maxWidth: 1000,
            maxHeight: 500,
            borderless: true,
            containment: '.playground',
            start: () => this.setState(TextBoxState.SELECTED),
            stop: (event) => {
                event.stopPropagation();
                this.setState(TextBoxState.SELECTED);
            }
        });
    }

    setupFontSizeHandle() {
        const handle = this.element.find('.textbox__resize-handle');
        
        handle.on('mousedown', (e) => {
            e.preventDefault();
            this._handleFontResize(e);
        });
    }

    _handleFontResize(startEvent) {
        this.element.draggable('disable');
        
        const initialY = startEvent.clientY;
        const initialFontSize = parseInt(this.fontSettings.size);

        const handleMouseMove = (e) => {
            const deltaY = e.clientY - initialY;
            const newFontSize = Math.min(400, Math.max(12, initialFontSize + deltaY / 2));
            this.updateFont({ size: `${newFontSize}px` });
        };

        const handleMouseUp = () => {
            $(document).off('mousemove', handleMouseMove);
            $(document).off('mouseup', handleMouseUp);
            this.element.draggable('enable');
        };

        $(document).on('mousemove', handleMouseMove);
        $(document).on('mouseup', handleMouseUp);
    }

    updateFont(settings) {
        const currentState = this.state;
        
        this.fontSettings = {
            ...this.fontSettings,
            ...settings
        };
        
        this.applyStyles();
        
        if (currentState !== TextBoxState.DEFAULT) {
            this.setState(currentState);
        }
    }
}

/**
 * Manages text boxes and fonts in the playground
 */
export default class TextEditor {
    constructor(playgroundSelector) {
        this.playground = $(playgroundSelector);
        this.textboxes = new Map();
        this.activeTextBox = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Textbox controls
        $('#add-text').on('click', () => this.createTextBox('text'));
        $('#add-paragraph').on('click', () => this.createTextBox('paragraph'));
        $('#delete-textbox').on('click', () => this.deleteActiveTextBox());

        // Playground interactions
        this.playground.on('click', (e) => {
            if (!$(e.target).closest('.textbox').length) {
                this.clearActiveTextBox();
            }
        });

        this.playground.on('dblclick', '.textbox', (e) => {
            const textbox = this.textboxes.get(e.currentTarget);
            if (textbox) {
                textbox.setState(TextBoxState.EDITING);
                this.activeTextBox = textbox;
            }
        });

        this.playground.on('mousedown', '.textbox', (e) => {
            if (e.target.closest('.textbox__content[contenteditable="true"]')) return;
            
            const textbox = this.textboxes.get(e.currentTarget);
            if (textbox) {
                textbox.setState(TextBoxState.SELECTED);
                this.activeTextBox = textbox;
            }
        });
    }

    createTextBox(type) {
        const content = type === 'paragraph' ? 'Double click to edit text' : 'Text';
        const textbox = new TextBox(type, content);
        
        this.playground.append(textbox.element);
        this.textboxes.set(textbox.element[0], textbox);
        
        textbox.setState(TextBoxState.SELECTED);
        this.activeTextBox = textbox;
    }

    deleteActiveTextBox() {
        if (!this.activeTextBox) return;
        
        const element = this.activeTextBox.element[0];
        this.textboxes.delete(element);
        this.activeTextBox.element.remove();
        this.activeTextBox = null;
    }

    clearActiveTextBox() {
        this.textboxes.forEach(textbox => textbox.setState(TextBoxState.DEFAULT));
        this.activeTextBox = null;
    }
}