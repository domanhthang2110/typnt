/**
 * Typelab Home Page Scripts
 * Controls font weight slider, 3D effects, and particles animations
 */
// Update import to use the class-based loader
import { GoogleFontsLoader } from './modules/google-fonts-loader.js';
import { quotes } from './quotes.js';

// Create an instance of the loader
let googleFontsLoader; 

// Add near the top with other global variables
let currentFontData = null;
let currentWeight = 400; // Add this line to make currentWeight global
let wasDragging = false; // Add this variable at the top with other globals
let dragStartWeight = 400; // Add this to keep track of starting weight
const quoteContainer = document.querySelector(".quote-container");
const quoteText = document.querySelector(".quote-text");
const quoteAuthor = document.querySelector(".quote-author");
let isChangingFont = false;  // Flag to track if a font change is in progress
let lastFontChangeTime = 0;  // Track the last time a font was changed
const MIN_FONT_CHANGE_INTERVAL = 800;  // Minimum milliseconds between font changes
let failedFonts = new Set(); // Track fonts that failed to load
let maxRetries = 5; // Maximum number of retries before giving up
let preloadedFonts = []; // Queue to store preloaded fonts
const PRELOAD_BATCH_SIZE = 3; // Number of fonts to preload at once
let isPreloading = false; // Flag to track if preloading is in progress

// Add font usage tracking
const fontUsage = new Map(); // Maps font name to last usage timestamp
const FONT_CLEANUP_INTERVAL = 60000; // Check for cleanup every 60 seconds
const FONT_EXPIRATION_TIME = 60000; // Unload fonts after 60 seconds of non-use

// Add these variables near the top with other global variables
let isLokiMode = false;
let originalTitleContent = null;
let originalFontInfo = null;
let lokiAudio = null; // For tracking the audio element

// Function to update font usage time
function updateFontUsageTime(fontName) {
  if (!fontName) return;
  fontUsage.set(fontName, Date.now());
}

// Replace the fetchRandomQuote function with this simpler version
function getRandomQuote() {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
}

function updateQuote(quote) {
    if (!quoteContainer || !quoteText || !quoteAuthor) return;

    if (quote) {
        quoteText.textContent = `${quote.content}`;
        quoteAuthor.textContent = `— ${quote.author}`;
        quoteContainer.classList.remove('opacity-0');
    } else {
        quoteContainer.classList.add('opacity-0');
    }
}

// Helper function to get a random variable font that hasn't failed before
function getRandomVariableFont(currentFontFamily = null) {
    // Get all fonts from the loader
    const fonts = googleFontsLoader.fonts;
    if (!fonts || fonts.length === 0) return null;
    
    // Filter only variable fonts that haven't failed before
    const variableFonts = fonts.filter(font => 
      googleFontsLoader.isVariableFont(font.name) && 
      !failedFonts.has(font.name));
    
    if (variableFonts.length === 0) {
      console.warn("No eligible variable fonts available");
      // Reset failed fonts if we've exhausted all options
      failedFonts.clear();
      return null;
    }
    
    // Select a random font different from the current one if possible
    let candidates = currentFontFamily ? 
      variableFonts.filter(font => font.name !== currentFontFamily) : 
      variableFonts;
    
    // If no other fonts are available, fall back to all variable fonts
    if (candidates.length === 0) candidates = variableFonts;
    
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// Helper function to preload fonts in the background
async function preloadFonts() {
  if (isPreloading) return;
  
  isPreloading = true;
  
  try {
    // Get all available fonts
    const fonts = googleFontsLoader.fonts;
    if (!fonts || fonts.length === 0) {
      console.warn("No fonts available for preloading");
      isPreloading = false;
      return;
    }
    
    // Get all variable fonts that haven't failed and aren't already preloaded or in use
    const currentFontFamily = currentFontData?.name;
    const preloadableFonts = fonts.filter(font => 
      googleFontsLoader.isVariableFont(font.name) && 
      !failedFonts.has(font.name) && 
      !preloadedFonts.some(f => f.name === font.name) &&
      font.name !== currentFontFamily
    );
    
    if (preloadableFonts.length === 0) {
      console.log("No new fonts to preload");
      isPreloading = false;
      return;
    }
    
    // Shuffle the fonts to get random ones
    const shuffled = preloadableFonts.sort(() => 0.5 - Math.random());
    
    // Take a few fonts to preload
    const fontsToPreload = shuffled.slice(0, PRELOAD_BATCH_SIZE);
    console.log(`Preloading ${fontsToPreload.length} fonts: ${fontsToPreload.map(f => f.name).join(', ')}`);
    
    // Load each font in parallel and add to preloaded queue if successful
    await Promise.all(fontsToPreload.map(async (font) => {
      try {
        await googleFontsLoader.loadFont(font.name);
        preloadedFonts.push(font);
        // Update usage time for preloaded fonts
        updateFontUsageTime(font.name);
        console.log(`Successfully preloaded: ${font.name}`);
      } catch (error) {
        console.warn(`Failed to preload font: ${font.name}`);
        failedFonts.add(font.name);
      }
    }));
  } catch (error) {
    console.error('Error during font preloading:', error);
  } finally {
    isPreloading = false;
  }
}

// Modified helper function to get a font - will use preloaded fonts first
function getNextFont(currentFontFamily = null) {
  // First try to use a preloaded font
  if (preloadedFonts.length > 0) {
    // Get a random preloaded font that's different from current
    const availablePreloaded = preloadedFonts.filter(font => 
      font.name !== currentFontFamily);
    
    if (availablePreloaded.length > 0) {
      // Remove the font from the preloaded queue
      const randomIndex = Math.floor(Math.random() * availablePreloaded.length);
      const selectedFont = availablePreloaded[randomIndex];
      
      // Remove this font from the preloaded list
      preloadedFonts = preloadedFonts.filter(font => font.name !== selectedFont.name);
      
      // Start preloading more fonts in the background for next clicks
      setTimeout(() => preloadFonts(), 100);
      
      return selectedFont;
    }
  }
  
  // If no preloaded fonts, fall back to getting a random font
  return getRandomVariableFont(currentFontFamily);
}

// Modified changeRandomFont function to disable Loki mode first
async function changeRandomFont(retryCount = 0) {
  // Only check if we're already changing a font, remove time check
  if (isChangingFont && retryCount === 0) {
    console.log("Font change rejected - already changing");
    return;
  }
  
  // If we've retried too many times, log error and exit
  if (retryCount >= maxRetries) {
    console.error(`Failed to load a font after ${maxRetries} attempts. Try again later.`);
    isChangingFont = false;
    return;
  }
  
  isChangingFont = true; // Set flag to prevent simultaneous changes
  
  const titleElement = document.querySelector(".home-font-title");
  const fontNameElement = document.querySelector(".home-font-name");
  const fontDesignerElement = document.querySelector(".home-font-designer");
  const quoteElements = document.querySelectorAll('.quote-container, .quote-text, .quote-author');
  
  if (!titleElement || !fontNameElement || !fontDesignerElement) {
    isChangingFont = false;
    return;
  }

  // NEW: First check and disable Loki mode if it's active
  if (isLokiMode) {
    console.log("Disabling Loki mode before changing font");
    removeLokiEffect(titleElement, fontNameElement, fontDesignerElement);
    isLokiMode = false;
  }

  try {
    // Get the current font family
    const currentFontFamily = currentFontData?.name;
    
    // Get the next font to use (preloaded if available)
    const nextFont = getNextFont(currentFontFamily);
    
    if (!nextFont) {
      console.warn("No suitable variable fonts found");
      isChangingFont = false;
      return;
    }
    
    // Get a random quote with each font change
    const randomQuote = getRandomQuote();

    console.log(`Changing to font: ${nextFont.name} (attempt ${retryCount + 1})`);

    // Load the font if it's not already loaded
    if (!googleFontsLoader.loadedFonts.has(nextFont.name)) {
      await googleFontsLoader.loadFont(nextFont.name);
    }
    
    // Update font usage time
    updateFontUsageTime(nextFont.name);

    // Store current font data
    currentFontData = nextFont;
    
    // Reset weight to 400 (normal) for each new font
    currentWeight = 400;
    dragStartWeight = 400;

    // Update the title font
    titleElement.style.fontFamily = `'${nextFont.name}', sans-serif`;
    titleElement.style.fontVariationSettings = `'wght' ${currentWeight}`;
    titleElement.style.fontWeight = currentWeight;
    
    // Also set for quote elements
    quoteElements.forEach(el => {
      el.style.fontFamily = `'${nextFont.name}', sans-serif`;
      el.style.fontVariationSettings = `'wght' ${currentWeight}`;
      el.style.fontWeight = currentWeight;
    });
    
    console.log(`Successfully applied font: ${nextFont.name} with weight ${currentWeight}`);

    // Update font info
    fontNameElement.innerHTML = `<a href="https://fonts.google.com/specimen/${nextFont.name.replace(/\s+/g, '+')}" target="_blank">${nextFont.name}</a>`;
    
    // Get designer info if available
    const designer = nextFont.designer || "Unknown Designer";
    fontDesignerElement.innerHTML = "designed by " + designer;
    
    // Update the quote text
    if (randomQuote) updateQuote(randomQuote);

    // Success! Reset the flag
    isChangingFont = false;
    
    // Start preloading more fonts right after successful change
    setTimeout(() => preloadFonts(), 100);
    
    // If we had a previous font, mark it for potential cleanup
    if (currentFontFamily && currentFontFamily !== nextFont.name) {
      // Keep the timestamp updated so it can be cleaned up later
      updateFontUsageTime(currentFontFamily); 
    }
    
  } catch (error) {
    console.error(`Failed to load font: ${error}`);
    
    // If we know which font failed, add it to our failed fonts set
    if (error.message && error.message.includes("Failed to load font:")) {
      const fontName = error.message.replace("Failed to load font:", "").trim();
      console.warn(`Adding ${fontName} to failed fonts list`);
      failedFonts.add(fontName);
    }
    
    // Retry with a different font
    console.log(`Retrying with a different font (attempt ${retryCount + 1})`);
    return changeRandomFont(retryCount + 1);
    
  } finally {
    // Reset flag on error only if not going to retry
    if (retryCount >= maxRetries) {
      isChangingFont = false;
    }
  }
}

// Add a function to clean up unused fonts
function cleanupUnusedFonts() {
  const now = Date.now();
  
  // Get list of currently loaded fonts from the loader
  const loadedFonts = Array.from(googleFontsLoader.loadedFonts);
  
  // Skip if we don't have enough loaded fonts
  if (loadedFonts.length <= 5) return;
  
  // Get current font and preloaded fonts (these should not be unloaded)
  const currentFontName = currentFontData?.name;
  const preloadedFontNames = preloadedFonts.map(font => font.name);
  
  // Check each loaded font to see if it's unused
  loadedFonts.forEach(fontName => {
    // Skip the current font
    if (fontName === currentFontName) return;
    
    // Skip preloaded fonts
    if (preloadedFontNames.includes(fontName)) return;
    
    // Skip Epilogue (default font)
    if (fontName === "Epilogue") return;
    
    // Check if the font has been unused for the expiration time
    const lastUsed = fontUsage.get(fontName) || 0;
    const timeSinceUse = now - lastUsed;
    
    if (lastUsed > 0 && timeSinceUse > FONT_EXPIRATION_TIME) {
      console.log(`Unloading unused font: ${fontName} (unused for ${Math.round(timeSinceUse/1000)}s)`);
      googleFontsLoader.unloadFont(fontName);
      fontUsage.delete(fontName);
    }
  });
}

// Helper function to find the closest available weight
function findClosestWeight(variants, targetWeight) {
    if (!variants || variants.length === 0) {
        return 400; // Default to normal
    }
    
    // Extract numeric weights
    const weights = variants
        .map(v => parseInt(v.replace('italic', '').replace('regular', '400')))
        .filter(w => !isNaN(w));
    
    if (weights.length === 0) {
        return 'normal'; // If no numeric weights, use normal
    }
    
    // Find the closest weight
    return weights.reduce((prev, curr) => {
        return (Math.abs(curr - targetWeight) < Math.abs(prev - targetWeight)) ? curr : prev;
    });
}

// Initialize the default Epilogue font data
function initDefaultFont() {
    // Create a default font data structure for Epilogue
    currentFontData = {
        name: "Epilogue",
        category: "sans-serif",
        axes: {
            wght: { min: 100, max: 900, default: 400 }
        }
    };
    
    // Mark Epilogue as used
    updateFontUsageTime("Epilogue");
    
    console.log("Default font initialized: Epilogue");
}

// Replace the 3D effect initialization with this improved version
function init3DEffect() {
  const titleElement = document.querySelector(".home-font-title");
  let isDragging = false;
  let startX = 0;
  let clickStartTime = 0;
  let clickStartPosition = { x: 0, y: 0 };
  const MAX_CLICK_DURATION = 300; // Max milliseconds for a click
  const MAX_CLICK_MOVEMENT = 10; // Max pixels of movement allowed for a click
  
  document.addEventListener("mousedown", (event) => {
    isDragging = true;
    wasDragging = false; // Reset at the start of potential drag
    startX = event.clientX;
    // Store the weight at the start of dragging
    dragStartWeight = currentWeight;
    
    // Store click start info
    clickStartTime = Date.now();
    clickStartPosition = { x: event.clientX, y: event.clientY };
  });

  // Update the mousemove event handler in init3DEffect
  document.addEventListener("mousemove", (event) => {
    const container = document.querySelector(".three-d-container");
    if (!container || !titleElement) return;
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rotateY = ((event.clientX - centerX) / rect.width) * 15;
    const rotateX = ((centerY - event.clientY) / rect.height) * 15;

    // Apply 3D rotation
    titleElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    // Weight adjustment while dragging
    if (isDragging) {
        // Check movement distance
        const moveX = Math.abs(event.clientX - clickStartPosition.x);
        const moveY = Math.abs(event.clientY - clickStartPosition.y);
        
        // If we've moved enough, consider it a drag rather than a click
        if (moveX > 3 || moveY > 3) {
            wasDragging = true;
        }
        
        const dx = event.clientX - startX;
        const weightChange = Math.round(dx); // Reduced sensitivity for better control
        const newWeight = Math.min(Math.max(dragStartWeight + weightChange, 100), 900);
        
        if (newWeight !== currentWeight) {
            currentWeight = newWeight;
            updateFontWeight();
        }
    }
  });

  document.addEventListener("mouseup", (event) => {
    if (!isDragging) return;
    
    // Calculate if this was a click or drag
    const clickDuration = Date.now() - clickStartTime;
    const moveX = Math.abs(event.clientX - clickStartPosition.x);
    const moveY = Math.abs(event.clientY - clickStartPosition.y);
    
    const wasClick = clickDuration < MAX_CLICK_DURATION && 
                    moveX < MAX_CLICK_MOVEMENT && 
                    moveY < MAX_CLICK_MOVEMENT;
    
    // If it was a genuine click and not a drag, change the font immediately
    if (wasClick && !wasDragging) {
      console.log("Click detected, changing font");
      changeRandomFont(0); // Remove delay, change immediately
    }
    
    isDragging = false;
  });

  document.addEventListener("mouseleave", () => {
    isDragging = false;
  });
}

// Separate function to update font weight for better maintenance
function updateFontWeight() {
    const titleElement = document.querySelector(".home-font-title");
    const quoteElements = document.querySelectorAll('.quote-container, .quote-text, .quote-author');
    
    if (!titleElement) return;
    
    // Default to treating as variable font for Epilogue
    let isVariable = true;
    
    // If we have current font data, use it to determine if variable
    if (currentFontData) {
        isVariable = googleFontsLoader.isVariableFont(currentFontData.name);
    }
    
    console.log(`Updating font weight: ${currentWeight}, Variable: ${isVariable}`);
    
    if (isVariable) {
        // Variable font approach
        titleElement.style.fontVariationSettings = `'wght' ${currentWeight}`;
        titleElement.style.fontWeight = currentWeight;
        
        quoteElements.forEach(el => {
            el.style.fontVariationSettings = `'wght' ${currentWeight}`;
            el.style.fontWeight = currentWeight;
        });
    } else if (currentFontData) {
        // For standard fonts with weights - use the GoogleFontsLoader to get variants
        const font = googleFontsLoader.getFont(currentFontData.name);
        if (font) {
            const variants = googleFontsLoader.getFontVariants(font.name);
            const closestVariant = variants.find(v => v.weight === currentWeight) || 
                                   variants.reduce((prev, curr) => 
                                     Math.abs(curr.weight - currentWeight) < Math.abs(prev.weight - currentWeight) ? curr : prev);
            
            titleElement.style.fontVariationSettings = '';
            titleElement.style.fontWeight = closestVariant.weight;
            titleElement.style.fontStyle = closestVariant.style;
            
            quoteElements.forEach(el => {
                el.style.fontVariationSettings = '';
                el.style.fontWeight = closestVariant.weight;
                el.style.fontStyle = closestVariant.style;
            });
        }
    }
}

// Add floating font particles
function initFontParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  
  // Initial font loading
  let availableFonts = [];
  let isInitialized = false;
  
  // Calculate visible height constraints for particles
  const containerTop = 120; // Match the container's padding-top from CSS
  const maxParticleHeight = window.innerHeight - containerTop;
  
  // Function to recalculate height constraints on window resize
  function updateHeightConstraints() {
    return window.innerHeight - containerTop;
  }
  
  // Add window resize listener to update constraints
  window.addEventListener('resize', () => {
    updateHeightConstraints();
  });
  
  // Start generating particles after fonts are loaded
  function startParticles() {
    // Filter only variable fonts
    availableFonts = googleFontsLoader.fonts.filter(font => googleFontsLoader.isVariableFont(font.name));
    isInitialized = true;
    // Start generating particles
    createFloatingParticle();
  }
  
  function createFloatingParticle() {
    if (!isInitialized || availableFonts.length === 0) {
      setTimeout(createFloatingParticle, 1000);
      return;
    }
    
    // Select a random variable font
    const randomIndex = Math.floor(Math.random() * availableFonts.length);
    const randomFont = availableFonts[randomIndex];
    
    // Load the selected font before creating the particle
    googleFontsLoader.loadFont(randomFont.name)
      .then(() => {
        // Update font usage time for this particle
        updateFontUsageTime(randomFont.name);
        
        // Create particle element after font is loaded
        const particle = document.createElement('div');
        particle.classList.add('font-particle');
        
        // Get a random weight for this particle
        const font = googleFontsLoader.getFont(randomFont.name);
        let weightMin = 400, weightMax = 700;
        
        if (font && font.axes && font.axes.wght) {
          weightMin = font.axes.wght.min || 400;
          weightMax = font.axes.wght.max || 700;
        }
        
        const randomWeight = Math.floor(Math.random() * (weightMax - weightMin + 1)) + weightMin;
        
        // Randomly determine if particle enters from left or right
        const enterFromLeft = Math.random() > 0.5;
        
        // Set initial position
        const startX = enterFromLeft ? -300 : window.innerWidth + 300;
        const endX = enterFromLeft ? window.innerWidth + 300 : -300;
        
        // Calculate a random Y position within the visible area constraints
        // Leave some margin at top and bottom for better aesthetics
        const margin = 50; // 50px margin from top and bottom
        const minY = containerTop + margin;
        const maxY = Math.min(maxParticleHeight, window.innerHeight - margin);
        const y = minY + Math.random() * (maxY - minY);
        
        // Set content - font name styled with its own font
        particle.innerHTML = `
          <span class="font-display" style="font-family: '${randomFont.name}'; 
          font-variation-settings: 'wght' ${randomWeight};">${randomFont.name}</span>
        `;
        
        // Set styles
        particle.style.position = 'absolute';
        particle.style.left = `${startX}px`;
        particle.style.top = `${y}px`;
        particle.style.opacity = '0';
        particle.style.zIndex = '-5';
        
        // Add to container
        particlesContainer.appendChild(particle);
        
        // Animation duration (between 15 and 30 seconds)
        const duration = 15000 + Math.random() * 15000;
        const speed = enterFromLeft ? 1 : -1;
        
        // Start animation
        setTimeout(() => particle.style.opacity = '0.7', 100);
        
        // Movement animation function
        const startTime = Date.now();
        function moveParticle() {
          const elapsed = Date.now() - startTime;
          const progress = elapsed / duration;
          
          if (progress >= 1) {
            particlesContainer.removeChild(particle);
            return;
          }
          
          // Calculate new position
          const distance = Math.abs(endX - startX);
          const currentX = startX + distance * progress * speed;
          particle.style.left = `${currentX}px`;
          
          // Fade out near the end
          if (progress > 0.8) {
            particle.style.opacity = `${0.7 * (1 - (progress - 0.8) * 5)}`;
          }
          
          requestAnimationFrame(moveParticle);
        }
        
        moveParticle();
        
        // Create new particle after a delay
        const nextDelay = 2000 + Math.random() * 3000; // Between 2 and 5 seconds
        setTimeout(createFloatingParticle, nextDelay);
      })
      .catch(error => {
        console.error(`Failed to load font for particle: ${randomFont.name}`, error);
        // Try again with a small delay if this font failed
        setTimeout(createFloatingParticle, 1000);
      });
  }
  
  // Start once fonts are available
  if (googleFontsLoader.fonts && googleFontsLoader.fonts.length > 0) {
    startParticles();
  } else {
    // Wait a bit and check again
    setTimeout(startParticles, 2000);
  }
}

function initTextTrail() {
  const trailContainer = document.createElement('div');
  trailContainer.className = 'text-trail-container';
  document.body.appendChild(trailContainer);

  let mouseTrail = [];
  const trailLength = 7; // Length of "Typelab"
  let lastCallTime = 0;
  const throttleTime = 40; // Minimum time between trail spawns
  const word = "Typelab";
  let currentCharIndex = 0;
  
  // Add tracking for previous mouse position
  let prevX = 0;
  let prevY = 0;

  // Cleanup function to remove old trails
  function cleanupTrails() {
    while (mouseTrail.length > 0) {
      const trail = mouseTrail.shift();
      if (trail && trail.parentNode) {
        trail.remove();
      }
    }
  }

  // Cleanup on page unload
  window.addEventListener('unload', cleanupTrails);

  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastCallTime < throttleTime) return;
    lastCallTime = now;

    // Calculate movement angle
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Update previous position
    prevX = e.clientX;
    prevY = e.clientY;

    const trail = document.createElement('div');
    trail.className = 'trail-character';
    
    // Center the character around the cursor
    trail.style.left = `${e.clientX - 8}px`; // Adjust by half character width
    trail.style.top = `${e.clientY}px`;  // Adjust by half character height
    
    // Apply rotation based on movement direction
    trail.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    
    // Get next character in "Typelab"
    trail.textContent = word[currentCharIndex];
    currentCharIndex = (currentCharIndex + 1) % word.length;
    
    trailContainer.appendChild(trail);
    mouseTrail.push(trail);

    // Remove old trails
    if (mouseTrail.length > trailLength) {
      const oldTrail = mouseTrail.shift();
      if (oldTrail && oldTrail.parentNode) {
        oldTrail.style.opacity = '0';
        oldTrail.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-20px)`;
        setTimeout(() => oldTrail.remove(), 500);
      }
    }

    // Fade out animation
    requestAnimationFrame(() => {
      trail.style.opacity = '0';
      trail.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-20px)`;
    });
  });

  // Clear trails when mouse leaves the window
  document.addEventListener('mouseleave', () => {
    mouseTrail.forEach(trail => {
      if (trail && trail.parentNode) {
        trail.style.opacity = '0';
        trail.style.transform += ' translateY(-20px)';
        setTimeout(() => trail.remove(), 500);
      }
    });
    mouseTrail = [];
    currentCharIndex = 0; // Reset the character index
    // Reset position tracking
    prevX = 0;
    prevY = 0;
  });
}

// Start the cleanup interval
function startFontCleanupInterval() {
  // Don't run cleanup too frequently
  setInterval(cleanupUnusedFonts, FONT_CLEANUP_INTERVAL);
  console.log(`Font cleanup scheduled every ${FONT_CLEANUP_INTERVAL/1000} seconds`);
}

// Add this function to handle the Loki effect toggle
function toggleLokiEffect() {
  const titleElement = document.querySelector(".home-font-title");
  const fontNameElement = document.querySelector(".home-font-name");
  const fontDesignerElement = document.querySelector(".home-font-designer");
  
  if (!titleElement || !fontNameElement || !fontDesignerElement) return;
  
  if (!isLokiMode) {
    // Store original content for later restoration
    originalTitleContent = titleElement.innerHTML;
    originalFontInfo = {
      name: fontNameElement.innerHTML,
      designer: fontDesignerElement.innerHTML,
      quote: null // Will store the quote if present
    };
    
    // Apply Loki effect
    applyLokiEffect(titleElement, fontNameElement, fontDesignerElement);
    isLokiMode = true;
  } else {
    // Restore original content
    removeLokiEffect(titleElement, fontNameElement, fontDesignerElement);
    isLokiMode = false;
  }
}

function applyLokiEffect(titleElement, fontNameElement, fontDesignerElement) {
  // Clear the title element
  titleElement.innerHTML = '';
  
  // Create a container for the animated text
  const lokiContainer = document.createElement('div');
  lokiContainer.className = 'loki-container loki-title';
  titleElement.appendChild(lokiContainer);
  
  // Add each letter of "TYPELAB" with animation
  const text = "TYPELAB";
  for (let i = 0; i < text.length; i++) {
    const letter = document.createElement('span');
    letter.className = 'loki-letter';
    letter.textContent = text[i];
    lokiContainer.appendChild(letter);
  }
  
  // Update font name and designer
  fontNameElement.innerHTML = `<a href="#">Typelab</a>`;
  fontDesignerElement.innerHTML = 'designed by Bach and Thang';
  
  // Add Loki animation class to title container
  titleElement.classList.add('loki-effect-active');
  
  // Add a Loki-themed quote about font variants
  const lokiQuote = {
    content: "Glorious purpose lies in every font. Like me, they have many variants, each shape-shifting to reveal a different version of themselves. Trust them not, for their forms are ever-changing... yet marvelous.",
    author: "Loki, God of Typography"
  };
  
  // Update the quote if it exists
  if (quoteContainer && quoteText && quoteAuthor) {
    // Store the current quote if not already stored
    if (!originalFontInfo.quote && quoteText.textContent) {
      originalFontInfo.quote = {
        content: quoteText.textContent,
        author: quoteAuthor.textContent
      };
    }
    
    // Update with Loki quote and apply the Philosopher font
    quoteText.textContent = lokiQuote.content;
    quoteText.style.fontFamily = "'Epilogue', sans-serif";
    quoteAuthor.textContent = `— ${lokiQuote.author}`;
    quoteAuthor.style.fontFamily = "'Epilogue', sans-serif";
    quoteContainer.classList.remove('opacity-0');
  }
  
  // Play TVA audio with fade-in effect
  playLokiAudio();
}

function removeLokiEffect(titleElement, fontNameElement, fontDesignerElement) {
  // Restore original contents
  if (originalTitleContent) {
    titleElement.innerHTML = originalTitleContent;
  }
  
  if (originalFontInfo) {
    fontNameElement.innerHTML = originalFontInfo.name;
    fontDesignerElement.innerHTML = originalFontInfo.designer;
    
    // Restore original quote if it existed
    if (originalFontInfo.quote && quoteContainer && quoteText && quoteAuthor) {
      quoteText.textContent = originalFontInfo.quote.content;
      quoteAuthor.textContent = originalFontInfo.quote.author;
      
      // Also restore the font family
      quoteText.style.fontFamily = ''; // Let it inherit from the current font
      quoteAuthor.style.fontFamily = ''; // Let it inherit from the current font
    }
  }
  
  // Remove Loki animation class
  titleElement.classList.remove('loki-effect-active');
  
  // Fade out and stop audio
  stopLokiAudio();
}

// New function to play audio with fade-in effect
function playLokiAudio() {
  try {
    // Create new audio instance if it doesn't exist
    if (!lokiAudio) {
      lokiAudio = new Audio('audio/tva.mp3');
      lokiAudio.volume = 0; // Start silent
      lokiAudio.loop = true; // Loop the TVA theme
    }
    
    // Start playing
    const playPromise = lokiAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Fade in over 1.5 seconds
        let volume = 0;
        const fadeInInterval = setInterval(() => {
          if (volume < 0.15) { // Target volume 0.7 (not too loud)
            volume += 0.05;
            lokiAudio.volume = volume;
          } else {
            clearInterval(fadeInInterval);
          }
        }, 100);
      }).catch(error => {
        console.warn('Audio playback was prevented:', error);
      });
    }
  } catch (error) {
    console.error('Failed to play Loki audio:', error);
  }
}

// New function to stop audio with fade-out effect
function stopLokiAudio() {
  if (!lokiAudio) return;
  
  // If audio is playing, fade it out
  if (!lokiAudio.paused) {
    // Store current volume
    const startVolume = lokiAudio.volume;
    
    // Fade out over 1.5 seconds
    const fadeOutInterval = setInterval(() => {
      if (lokiAudio.volume > 0.05) {
        lokiAudio.volume -= 0.05;
      } else {
        clearInterval(fadeOutInterval);
        lokiAudio.pause();
        lokiAudio.currentTime = 0; // Reset position
      }
    }, 100);
  } else {
    // If not playing, just reset it
    lokiAudio.pause();
    lokiAudio.currentTime = 0;
  }
}

// Modify the initHomePage function to initialize the GoogleFontsLoader
async function initHomePage() {
    try {
        // Initialize the GoogleFontsLoader with data from fontinfo.json
        googleFontsLoader = await GoogleFontsLoader.fromJson("/data/fontinfo.json");
        
        // Make it available globally
        window.googleFontsLoader = googleFontsLoader;
        
        console.log(`Loaded ${googleFontsLoader.fonts.length} fonts`);
        
        // Set up initial font data for Epilogue
        initDefaultFont();
        
        // Ensure Epilogue is loaded
        await googleFontsLoader.loadFont("Epilogue");
        updateFontUsageTime("Epilogue");
        
        init3DEffect(); // This now handles clicks properly
        
        // Show a quote on first load without changing the font
        const initialQuote = getRandomQuote();
        if (initialQuote) updateQuote(initialQuote);
        
        // Start preloading fonts right away
        setTimeout(() => preloadFonts(), 500);
        
        initFontParticles();
        initTextTrail();
        
        // Start font cleanup interval
        startFontCleanupInterval();
      
        // Add keyboard event listener for Loki mode toggle
        document.addEventListener('keydown', (e) => {
          // Only respond if not in an input field
          if (e.target.tagName === 'INPUT' || 
              e.target.tagName === 'TEXTAREA' || 
              e.target.contentEditable === 'true') {
            return;
          }
          
          // Check for 'T' key press
          if (e.key.toLowerCase() === 't') {
            toggleLokiEffect();
          }
        });
      
    } catch (error) {
        console.error('Failed to initialize fonts:', error);
        // Still set up the default font even if Google Fonts fail
        initDefaultFont();
        init3DEffect();
        initTextTrail();
    }
}

// Add event listener to update when page becomes hidden or visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // When page becomes visible again, delay font cleanup a bit
    setTimeout(cleanupUnusedFonts, 30000);
  }
});

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initHomePage);

// Clean up resources before page unload
window.addEventListener('beforeunload', () => {
  // Additional cleanup here if needed
});