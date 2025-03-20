import { state as textboxState, saveTextboxesToStorage } from "./textbox.js";
import { getSelectedFontData, saveSelectedFontState } from "./font-manager.js";

// Constants for storage keys
const SESSION_PANEL_STATE_KEY = 'typelab_session_panel_state';
const SESSION_UI_STATE_KEY = 'typelab_session_ui_state';
const SESSION_FONT_STATE_KEY = 'typelab_session_font_state';

// Session management class
class SessionManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Save state when navigating away
        window.addEventListener('beforeunload', (event) => {
            // Don't prompt user when navigating within the site
            this.saveAllState();
        });

        // Listen for panel state changes
        document.addEventListener('panel-state-changed', (e) => {
            this.savePanelState();
        });

        // Listen for UI state changes (grid visibility, etc)
        document.addEventListener('ui-state-changed', (e) => {
            this.saveUIState();
        });

        // Add listener for font selection
        document.addEventListener("font-selected", (e) => {
            this.saveFontState();
        });

        // Add listener for settings panel changes
        document.addEventListener("settings-changed", (e) => {
            setTimeout(() => this.saveFontState(), 100); // Slight delay to ensure UI is updated
        });
    }

    saveAllState() {
        // Save textboxes (using session storage)
        saveTextboxesToStorage();
        
        // Save panel states
        this.savePanelState();
        
        // Save UI state
        this.saveUIState();
        
        // Save font state
        this.saveFontState();
    }

    savePanelState() {
        const panelStates = {};
        
        // Get all panels and their collapsed state and positions
        document.querySelectorAll('.panel').forEach(panel => {
            const panelId = panel.id;
            if (panelId) {
                // Get panel position if it has one
                const rect = panel.getBoundingClientRect();
                
                panelStates[panelId] = {
                    collapsed: panel.classList.contains('panel--collapsed'),
                    position: {
                        top: panel.style.top,
                        left: panel.style.left,
                        width: panel.style.width,
                        height: panel.style.height
                    },
                    rect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    }
                };
            }
        });
        
        sessionStorage.setItem(SESSION_PANEL_STATE_KEY, JSON.stringify(panelStates));
    }

    saveFontState() {
        // Save selected font and settings
        const selectedFont = getSelectedFontData();
        if (!selectedFont) return;
        
        // Get font list scroll position
        const fontList = document.getElementById('font-list');
        const fontListScrollTop = fontList ? fontList.scrollTop : 0;
        
        // Get active textbox font settings
        const activeTextboxStyles = textboxState.activeTextbox ? 
            textboxState.textboxes.get(textboxState.activeTextbox)?.styles : null;
        
        const fontState = {
            selectedFont,
            fontListScrollTop,
            activeTextboxStyles
        };
        
        sessionStorage.setItem(SESSION_FONT_STATE_KEY, JSON.stringify(fontState));
    }

    saveUIState() {
        const uiState = {
            gridVisible: !document.querySelector('.playground__grid')?.classList.contains('hidden'),
            // Add font search value
            fontSearch: document.querySelector('.font-search__input')?.value || ''
        };
        
        sessionStorage.setItem(SESSION_UI_STATE_KEY, JSON.stringify(uiState));
    }

    loadAllState() {
        // Load textboxes (handled by textbox.js)
        
        // Load panel states
        this.loadPanelState();
        
        // Load UI state
        this.loadUIState();
        
        // Load font state
        this.loadFontState();
    }

    loadPanelState() {
        try {
            const panelStates = JSON.parse(sessionStorage.getItem(SESSION_PANEL_STATE_KEY));
            if (!panelStates) return;
            
            // Apply saved panel states
            Object.entries(panelStates).forEach(([panelId, state]) => {
                const panel = document.getElementById(panelId);
                if (panel) {
                    // Set collapsed state
                    if (state.collapsed) {
                        panel.classList.add('panel--collapsed');
                    } else {
                        panel.classList.remove('panel--collapsed');
                    }
                    
                    // Update toggle button text
                    const toggleBtn = panel.querySelector('.panel__toggle');
                    if (toggleBtn) {
                        toggleBtn.textContent = state.collapsed ? '+' : '−';
                    }
                    
                    // Apply position if available
                    if (state.position) {
                        panel.style.top = state.position.top || '';
                        panel.style.left = state.position.left || '';
                        panel.style.width = state.position.width || '';
                        panel.style.height = state.position.height || '';
                    }
                }
            });
        } catch (error) {
            console.error('Error loading panel states:', error);
        }
    }

    loadFontState() {
        try {
            const fontState = JSON.parse(sessionStorage.getItem(SESSION_FONT_STATE_KEY));
            if (!fontState) return;
            
            // Restore font list scroll position after a short delay to ensure DOM is ready
            setTimeout(() => {
                const fontList = document.getElementById('font-list');
                if (fontList && fontState.fontListScrollTop) {
                    fontList.scrollTop = fontState.fontListScrollTop;
                }
                
                // Restore selected font
                if (fontState.selectedFont) {
                    saveSelectedFontState(fontState.selectedFont);
                }
            }, 300);
        } catch (error) {
            console.error('Error loading font state:', error);
        }
    }

    loadUIState() {
        try {
            const uiState = JSON.parse(sessionStorage.getItem(SESSION_UI_STATE_KEY));
            if (!uiState) return;
            
            // Apply grid visibility
            const grid = document.querySelector('.playground__grid');
            const gridButton = document.getElementById('toggle-grid');
            
            if (grid && gridButton) {
                if (uiState.gridVisible) {
                    grid.classList.remove('hidden');
                    gridButton.classList.add('active');
                    const icon = gridButton.querySelector('.material-symbols-outlined');
                    if (icon) icon.textContent = 'grid_on';
                } else {
                    grid.classList.add('hidden');
                    gridButton.classList.remove('active');
                    const icon = gridButton.querySelector('.material-symbols-outlined');
                    if (icon) icon.textContent = 'check_box_outline_blank';
                }
            }
            
            // Restore font search if exists
            const fontSearch = document.querySelector('.font-search__input');
            if (fontSearch && uiState.fontSearch) {
                fontSearch.value = uiState.fontSearch;
                // Trigger search event
                const event = new Event('input', { bubbles: true });
                fontSearch.dispatchEvent(event);
            }
        } catch (error) {
            console.error('Error loading UI state:', error);
        }
    }

    // Helper method to clear session data
    clearSessionData() {
        sessionStorage.removeItem(SESSION_PANEL_STATE_KEY);
        sessionStorage.removeItem(SESSION_UI_STATE_KEY);
        sessionStorage.removeItem(SESSION_FONT_STATE_KEY);
    }
}

export default SessionManager;
