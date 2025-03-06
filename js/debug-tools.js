/**
 * Debug Tools Module
 * Provides debugging functionality for the font archive
 */

// Debug state
const debugState = {
  loggingEnabled: localStorage.getItem('font-debug-logging') === 'true',
  stats: {
    loadedFonts: 0,
    variableFonts: 0,
    failedFonts: 0,
    loadTime: 0
  }
};

// Initialize debug tools
export function initDebugTools() {
  // Check if debug panel exists
  const debugPanel = document.getElementById('debug-panel');
  if (!debugPanel) return;
  
  // Setup event listeners for debug buttons
  setupDebugEventListeners();
  
  // Override console methods if debug logging is enabled
  if (debugState.loggingEnabled) {
    enableVerboseLogging();
  }
  
  // Log that debug tools are initialized
  debugLog('Debug tools initialized');
}

// Update debug statistics displayed in the panel
export function updateDebugStats(state, fontLoader) {
  const debugLoadedCount = document.getElementById('debug-loaded-count');
  const debugVariableCount = document.getElementById('debug-variable-count');
  const debugCurrentPage = document.getElementById('debug-current-page');
  const debugTotalFonts = document.getElementById('debug-total-fonts');
  const debugFilter = document.getElementById('debug-filter');
  
  if (debugLoadedCount) {
    debugLoadedCount.textContent = fontLoader?.loade