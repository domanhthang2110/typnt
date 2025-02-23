export default class TextBoxManager {
    static selectedTextBox = null;
    static editingTextBox = null;

    constructor(playgroundSelector) {
        this.playground = $(playgroundSelector);
        this.setupEventListeners();
    }

    setupEventListeners() {
        $('#add-text').on('click', () => this.createTextBox('text'));
        $('#add-paragraph').on('click', () => this.createTextBox('paragraph'));
        $('#delete-textbox').on('click', () => this.deleteSelectedTextBox());
        
        // Document-level click handler for state management
        $(document).on('click', (e) => {
            const clickedTextbox = $(e.target).closest('.textbox');
            const isControl = $(e.target).closest('#add-text, #add-paragraph, #delete-textbox').length > 0;
            
            if (!clickedTextbox.length && !isControl) {
                this.setUnselectedState();
            }
        });
    }

    createTextBox(type) {
        const textbox = $(`
            <div class="textbox ${type === 'paragraph' ? 'textbox--paragraph' : ''}">
                <div class="textbox__content" contenteditable="false">
                    ${type === 'paragraph' ? 'Lorem ipsum dolor sit amet...' : 'Text'}
                </div>
                <div class="textbox__resize-handle"></div>
            </div>
        `);
        
        this.playground.append(textbox);
        this.setupTextBoxStates(textbox, type);
        return textbox;
    }

    setupTextBoxStates(textbox, type) {
        textbox.css({ top: '20%', left: '20%' });

        // Unselected state (hover only)
        textbox.on('mouseenter mouseleave', () => {
            if (TextBoxManager.selectedTextBox !== textbox) {
                textbox.toggleClass('textbox--hover');
            }
        });

        // Selected state
        textbox.on('click', (e) => {
            e.stopPropagation();
            this.setSelectedState(textbox);
        });

        // Edit state
        textbox.on('dblclick', (e) => {
            e.stopPropagation();
            this.setEditState(textbox);
        });

        // Setup resize and drag functionality
        this.setupDraggable(textbox);
        if (type === 'paragraph') {
            this.setupResizable(textbox);
        }
        this.setupFontSizeHandle(textbox);
    }

    setUnselectedState() {
        if (TextBoxManager.editingTextBox) {
            TextBoxManager.editingTextBox.find('.textbox__content').attr('contenteditable', 'false');
            TextBoxManager.editingTextBox = null;
        }
        $('.textbox').removeClass('textbox--selected textbox--editing');
        TextBoxManager.selectedTextBox = null;
    }

    setSelectedState(textbox) {
        this.setUnselectedState();
        textbox.addClass('textbox--selected');
        TextBoxManager.selectedTextBox = textbox;
    }

    setEditState(textbox) {
        if (TextBoxManager.selectedTextBox !== textbox) {
            this.setSelectedState(textbox);
        }
        textbox.addClass('textbox--editing');
        const content = textbox.find('.textbox__content');
        content.attr('contenteditable', 'true');
        content.focus();
        TextBoxManager.editingTextBox = textbox;
    }

    deleteSelectedTextBox() {
        if (TextBoxManager.selectedTextBox) {
            TextBoxManager.selectedTextBox.remove();
            TextBoxManager.selectedTextBox = null;
        }
    }

    setupDraggable(textbox) {
        textbox.draggable({
            containment: ".playground",
            start: function() {
                $(".textbox").not(this).removeClass("textbox--focused");
                $(this).addClass("textbox--focused");
            }
        });
    }

    setupResizable(textbox) {
        textbox.resizable({
            handles: 'n, e, s, w, ne, nw, se, sw',
            minWidth: 100,
            minHeight: 50,
            maxWidth: 1000,
            maxHeight: 500,
            containment: '.playground',
            start: function(event, ui) {
                // Ensure handles stay visible during resize
                $(this).addClass('textbox--selected');
            },
            stop: function(event, ui) {
                // Prevent deselection after resize
                event.stopPropagation();
                $(this).addClass('textbox--selected');
            }
        });
    }

    setupFontSizeHandle(textbox) {
        const handle = textbox.find(".textbox__resize-handle");
        handle.on("mousedown", (e) => {
            e.preventDefault();
            textbox.draggable("disable");
            
            const initialY = e.clientY;
            const initialFontSize = parseInt(textbox.css("font-size"));

            const handleMouseMove = (e) => {
                const deltaY = e.clientY - initialY;
                const newFontSize = Math.min(400, Math.max(12, initialFontSize + deltaY / 2));
                textbox.css("font-size", `${newFontSize}px`);
            };

            const handleMouseUp = () => {
                $(document).off("mousemove", handleMouseMove);
                $(document).off("mouseup", handleMouseUp);
                textbox.draggable("enable");
            };

            $(document).on("mousemove", handleMouseMove);
            $(document).on("mouseup", handleMouseUp);
        });
    }
}