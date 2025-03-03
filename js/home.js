/**
 * Typelab Home Page Scripts
 * Controls font weight slider, 3D effects, and particles animations
 */
// Add this near the top of the file
import { googleFontsLoader } from './modules/google-fonts-loader.js';
import { quotes } from './quotes.js';
import { initDebugTools } from './debug-tools.js';

// Make it available globally
window.googleFontsLoader = googleFontsLoader;

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
function getRandomVariableFont(fonts, currentFontFamily = null) {
    if (!fonts || fonts.length === 0) return null;
    
    // Filter only variable fonts that haven't failed before
    const variableFonts = fonts.filter(font => 
      googleFontsLoader.isVariableFont(font) && 
      !failedFonts.has(font.family));
    
    if (variableFonts.length === 0) {
      console.warn("No eligible variable fonts available");
      // Reset failed fonts if we've exhausted all options
      failedFonts.clear();
      return null;
    }
    
    // Select a random font different from the current one if possible
    let candidates = currentFontFamily ? 
      variableFonts.filter(font => font.family !== currentFontFamily) : 
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
    const fonts = await googleFontsLoader.getFonts();
    if (!fonts || fonts.length === 0) {
      console.warn("No fonts available for preloading");
      isPreloading = false;
      return;
    }
    
    // Get all variable fonts that haven't failed and aren't already preloaded or in use
    const currentFontFamily = currentFontData?.family;
    const preloadableFonts = fonts.filter(font => 
      googleFontsLoader.isVariableFont(font) && 
      !failedFonts.has(font.family) && 
      !preloadedFonts.some(f => f.family === font.family) &&
      font.family !== currentFontFamily
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
    console.log(`Preloading ${fontsToPreload.length} fonts: ${fontsToPreload.map(f => f.family).join(', ')}`);
    
    // Load each font in parallel and add to preloaded queue if successful
    await Promise.all(fontsToPreload.map(async (font) => {
      try {
        await googleFontsLoader.loadSingleFont(font.family);
        preloadedFonts.push(font);
        console.log(`Successfully preloaded: ${font.family}`);
      } catch (error) {
        console.warn(`Failed to preload font: ${font.family}`);
        failedFonts.add(font.family);
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
      font.family !== currentFontFamily);
    
    if (availablePreloaded.length > 0) {
      // Remove the font from the preloaded queue
      const randomIndex = Math.floor(Math.random() * availablePreloaded.length);
      const selectedFont = availablePreloaded[randomIndex];
      
      // Remove this font from the preloaded list
      preloadedFonts = preloadedFonts.filter(font => font.family !== selectedFont.family);
      
      // Start preloading more fonts in the background for next clicks
      setTimeout(() => preloadFonts(), 100);
      
      return selectedFont;
    }
  }
  
  // If no preloaded fonts, fall back to getting a random font
  return getRandomVariableFont(googleFontsLoader.getFonts(), currentFontFamily);
}

// Modified changeRandomFont function to use preloaded fonts and remove cooldown
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

  try {
    // Get the current font family
    const currentFontFamily = currentFontData?.family;
    
    // Get the next font to use (preloaded if available)
    const nextFont = await getNextFont(currentFontFamily);
    
    if (!nextFont) {
      console.warn("No suitable variable fonts found");
      isChangingFont = false;
      return;
    }
    
    // Get a random quote with each font change
    const randomQuote = getRandomQuote();

    console.log(`Changing to font: ${nextFont.family} (attempt ${retryCount + 1})`);

    // The font should already be loaded if it was preloaded
    // But we'll check the loaded fonts set to be sure
    if (!googleFontsLoader.loadedFonts.has(nextFont.family)) {
      await googleFontsLoader.loadSingleFont(nextFont.family);
    }

    // Store current font data
    currentFontData = nextFont;
    
    // Reset weight to 400 (normal) for each new font
    currentWeight = 400;
    dragStartWeight = 400;

    // Update the title font
    titleElement.style.fontFamily = `'${nextFont.family}', sans-serif`;
    titleElement.style.fontVariationSettings = `'wght' ${currentWeight}`;
    titleElement.style.fontWeight = currentWeight;
    
    // Also set for quote elements
    quoteElements.forEach(el => {
      el.style.fontFamily = `'${nextFont.family}', sans-serif`;
      el.style.fontVariationSettings = `'wght' ${currentWeight}`;
      el.style.fontWeight = currentWeight;
    });
    
    console.log(`Successfully applied font: ${nextFont.family} with weight ${currentWeight}`);

    // Update font info
    fontNameElement.textContent = nextFont.family;
    const designer = nextFont.designer || "Unknown Designer";
    fontDesignerElement.textContent = "Designed by " + designer;
    
    // Update the quote text
    if (randomQuote) updateQuote(randomQuote);

    // Success! Reset the flag
    isChangingFont = false;
    
    // Start preloading more fonts right after successful change
    setTimeout(() => preloadFonts(), 100);
    
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
        family: "Epilogue",
        category: "sans-serif",
        variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900", 
                  "100italic", "200italic", "300italic", "400italic", "500italic", 
                  "600italic", "700italic", "800italic", "900italic"],
        axes: ["wght"],  // This indicates it's a variable font
        files: {}
    };
    
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
        const weightChange = Math.round(dx / 2); // Reduced sensitivity for better control
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
        isVariable = googleFontsLoader.isVariableFont ? 
                    googleFontsLoader.isVariableFont(currentFontData) : 
                    currentFontData.axes && currentFontData.axes.includes("wght");
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
        // Standard font - find closest available weight
        const closestWeight = findClosestWeight(currentFontData.variants, currentWeight);
        titleElement.style.fontVariationSettings = '';
        titleElement.style.fontWeight = closestWeight;
        
        quoteElements.forEach(el => {
            el.style.fontVariationSettings = '';
            el.style.fontWeight = closestWeight;
        });
    }
}

// Add floating font particles
function initFontParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  
  // Initial font loading
  let availableFonts = [];
  let isInitialized = false;
  
  // Initialize with some fonts
  googleFontsLoader.init('/fonts.json')
    .then(fonts => {
      // Filter only variable fonts
      availableFonts = fonts.filter(font => googleFontsLoader.isVariableFont(font));
      isInitialized = true;
    })
    .then(() => {
      // Start generating particles once fonts are loaded
      createFloatingParticle();
    })
    .catch(error => console.error('Failed to initialize font particles:', error));
  
  function createFloatingParticle() {
    if (!isInitialized || availableFonts.length === 0) {
      setTimeout(createFloatingParticle, 1000);
      return;
    }
    
    // Select a random variable font
    const randomIndex = Math.floor(Math.random() * availableFonts.length);
    const randomFont = availableFonts[randomIndex];
    
    // Load the selected font before creating the particle
    googleFontsLoader.loadSingleFont(randomFont.family)
      .then(() => {
        // Create particle element after font is loaded
        const particle = document.createElement('div');
        particle.classList.add('font-particle');
        
        // Get a random weight for this particle
        const weightRange = googleFontsLoader.getWeightRange(randomFont);
        const randomWeight = Math.floor(Math.random() * 
            (weightRange.max - weightRange.min + 1)) + weightRange.min;
        
        // Randomly determine if particle enters from left or right
        const enterFromLeft = Math.random() > 0.5;
        
        // Set initial position
        const startX = enterFromLeft ? -300 : window.innerWidth + 300;
        const endX = enterFromLeft ? window.innerWidth + 300 : -300;
        const y = Math.random() * window.innerHeight;
        
        // Set content - font name styled with its own font
        particle.innerHTML = `
          <span class="font-display" style="font-family: '${randomFont.family}'; 
          font-variation-settings: 'wght' ${randomWeight};">${randomFont.family}</span>
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
        console.error(`Failed to load font for particle: ${randomFont.family}`, error);
        // Try again with a small delay if this font failed
        setTimeout(createFloatingParticle, 1000);
      });
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

// Modify the initHomePage function to remove the separate click listener
function initHomePage() {
    // Initialize fonts loader first
    googleFontsLoader.init('/fonts.json')
        .then(() => {
            // Set up initial font data for Epilogue
            initDefaultFont();
            
            init3DEffect(); // This now handles clicks properly
            
            // Show a quote on first load without changing the font
            const initialQuote = getRandomQuote();
            if (initialQuote) updateQuote(initialQuote);
            
            // Start preloading fonts right away
            setTimeout(() => preloadFonts(), 500);
            
            initFontParticles();
            initTextTrail();
            
            // Initialize debug tools
            initDebugTools();
        })
        .catch(error => {
            console.error('Failed to initialize fonts:', error);
            // Still set up the default font even if Google Fonts fail
            initDefaultFont();
            init3DEffect();
            initTextTrail();
        });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initHomePage);