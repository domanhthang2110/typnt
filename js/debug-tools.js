/**
 * Debug Tools for Typelab
 * Provides keyboard shortcuts to help with debugging and development
 */

// State to track if outlines are currently enabled
let outlinesEnabled = false;

// Create a style element to hold our debug styles
const debugStyles = document.createElement('style');
debugStyles.id = 'debug-outline-styles';
document.head.appendChild(debugStyles);

/**
 * Toggle outline on all elements for debugging layout
 */
function toggleOutlines() {
    outlinesEnabled = !outlinesEnabled;
    
    if (outlinesEnabled) {
        // Apply debug outlines
        debugStyles.textContent = `
            * {
                outline: 1px solid rgba(255, 0, 0, 0.5) !important;
            }
            
            *:hover {
                outline: 1px solid rgba(255, 0, 0, 1) !important;
            }
        `;
        console.log('✅ Debug outlines enabled');
    } else {
        // Remove debug outlines
        debugStyles.textContent = '';
        console.log('❌ Debug outlines disabled');
    }
}

/**
 * Initialize debug keyboard shortcuts
 */
function initDebugTools() {
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Ctrl+Shift+O to toggle outlines
        if (event.key === 'o') {
            event.preventDefault();
            toggleOutlines();
        }
    });
    
    console.log('Debug tools initialized - Press Ctrl+Shift+O to toggle element outlines');
}

// Export the initialization function
export { initDebugTools };
