/**
 * Main Lab Application
 * Initializes and coordinates all lab components
 */
import RulerManager from './modules/rulers.js';
import TextBoxManager from './modules/textbox.js';
import ButtonManager from './modules/buttons.js';
import PanelManager from './modules/panels.js';
import FontManager from './modules/font-manager.js';

class LabApp {
    constructor() {
        this.outlineEnabled = false;
        this.fontManager = new FontManager();
        this.init();
        this.panelManager = new PanelManager();
    }

    init() {
        this.buttonManager = new ButtonManager();
        this.rulerManager = new RulerManager();
        this.textBoxManager = new TextBoxManager('.playground');
        this.setupKeyboardShortcuts();
        this.setupPanelToggles();
    }

    setupKeyboardShortcuts() {
        document.addEventListener("keydown", (event) => {
            switch(event.key.toLowerCase()) {
                case 'o':
                    this.toggleOutline();
                    break;
                case 'escape':
                    this.deselectAll();
                    break;
            }
        });
    }

    setupPanelToggles() {
        document.querySelectorAll('.panel__toggle').forEach(button => {
            button.addEventListener('click', () => {
                const panel = button.closest('.panel');
                panel.classList.toggle('panel--collapsed');
                button.textContent = panel.classList.contains('panel--collapsed') ? '+' : '−';
            });
        });
    }

    toggleOutline() {
        if (this.outlineEnabled) {
            const styleElement = document.querySelector("style#outline-style");
            if (styleElement) {
                styleElement.remove();
            }
        } else {
            const style = document.createElement("style");
            style.id = "outline-style";
            style.innerHTML = "* { outline: 1px solid red; }";
            document.head.appendChild(style);
        }
        this.outlineEnabled = !this.outlineEnabled;
    }

    deselectAll() {
        $(".textbox").removeClass("textbox--focused textbox--editing")
            .removeAttr("contenteditable")
            .draggable("enable");
    }
}

// Initialize the app when document is ready
$(document).ready(() => {
    const lab = new LabApp();
});

export default LabApp;