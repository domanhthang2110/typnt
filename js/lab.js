/**
 * Main Lab Application
 * Initializes and coordinates all lab components
 */
import RulerManager from './modules/rulers.js';
import PanelManager from './modules/panels.js';
import { init as initTextbox } from './modules/textbox.js';
import { initFontManager, showUserManual } from './modules/font-manager.js';
import SessionManager from './modules/session-manager.js';

class LabApp {
    constructor() {
        this.outlineEnabled = false;
        this.sessionManager = null;
        this.init();
        this.panelManager = new PanelManager();
    }

    async init() {
        this.rulerManager = new RulerManager();
        this.setupPanelToggles();
        await this.initFontManager(); // Make this await the font manager initialization
        this.setupGridToggle();
        
        // Initialize session manager after the UI is set up
        this.sessionManager = new SessionManager();
        this.sessionManager.loadAllState();
        
        // Show the user manual when the app starts
        document.addEventListener("font-manager-ready", () => {
            showUserManual();
        });
        
        // Dispatch event to trigger initial manual display
        document.dispatchEvent(new CustomEvent("font-manager-ready"));
    }

    setupPanelToggles() {
        document.querySelectorAll('.panel__toggle').forEach(button => {
            button.addEventListener('click', () => {
                const panel = button.closest('.panel');
                panel.classList.toggle('panel--collapsed');
                button.textContent = panel.classList.contains('panel--collapsed') ? '+' : '−';
                
                // Dispatch event for session manager
                document.dispatchEvent(new CustomEvent('panel-state-changed'));
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
            
            // Dispatch event for session manager
            document.dispatchEvent(new CustomEvent('ui-state-changed'));
        });
    }

    async initFontManager() {
        console.log("Initializing font manager...");
        try {
            await initFontManager(this.textBoxManager);
            console.log("Font manager initialized successfully");
        } catch (error) {
            console.error("Error initializing font manager:", error);
        }
    }
}

// Initialize the app when document is ready
$(document).ready(async () => {
    console.log("Lab starting up...");
    const lab = new LabApp();
    await initTextbox('.playground');
    console.log("Lab initialized");
});

export default LabApp;