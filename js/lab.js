/**
 * Main Lab Application
 * Initializes and coordinates all lab components
 */
import RulerManager from './modules/rulers.js';
import PanelManager from './modules/panels.js';
import { init as initTextbox } from './modules/textbox.js';
import { initFontManager } from './modules/font-manager.js';

class LabApp {
    constructor() {
        this.outlineEnabled = false;
        this.init();
        this.panelManager = new PanelManager();
    }

    init() {
        this.rulerManager = new RulerManager();
        this.setupKeyboardShortcuts();
        this.setupPanelToggles();
        this.initFontManager();
        this.setupGridToggle();
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

    setupGridToggle() {
        const gridButton = document.getElementById('toggle-grid');
        const grid = document.querySelector('.playground__grid');
        
        gridButton.addEventListener('click', () => {
            gridButton.classList.toggle('active');
            grid.classList.toggle('hidden');
            
            // Toggle between grid_on and checkbox icons
            const icon = gridButton.querySelector('.material-symbols-outlined');
            if (grid.classList.contains('hidden')) {
                icon.textContent = 'check_box_outline_blank';
            } else {
                icon.textContent = 'grid_on';
            }
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
        if (this.textEditor) {
            this.textEditor.clearActiveTextBox();
        }
    }

    async initFontManager() {
        await initFontManager(this.textBoxManager);
    }
}

// Initialize the app when document is ready
$(document).ready(() => {
    const lab = new LabApp();
    initTextbox('.playground');
});

export default LabApp;