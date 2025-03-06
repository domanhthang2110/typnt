/**
 * Typ.nt Videos Page JavaScript
 * Handles loading videos from YouTube API, filtering by category,
 * and managing the video player overlay
 */

// YouTube API key - Replace with your own
const API_KEY = "AIzaSyD-9vfDrTeZUu7dBM00P2X9xh7uQLqtB3U";

// Constants
const VIDEOS_PER_ROW = 4;
const INITIAL_ROWS = 2;
const ROWS_TO_SHOW_MORE = 2;

// Track loaded rows for each section
let loadedLessonsRows = INITIAL_ROWS;
let loadedShortsRows = INITIAL_ROWS;

// Video data arrays
let lessonVideos = [];
let shortVideos = [];

// Currently active video data
let currentVideoData = null;

// Define lesson videos with their categories
const lessonVideoIds = [
  { id: "AXpxZMRM1EY", category: "basics" },
  { id: "QrNi9FmdlxY", category: "basics" },
  { id: "HA1Bw2h73Ow", category: "basics" },
  { id: "Oo5LCXPkkhc", category: "history" },
  { id: "wOgIkxAfJsk", category: "history" },
  { id: "WVfRxFwVHQc", category: "history" },
  { id: "yAuUDyUC-GM", category: "technique" },
  { id: "qzrKARm3v0w", category: "technique" },
  { id: "y2Tn9DS4ROs", category: "technique" },
  { id: "LLFvBVgpqPY", category: "design" },
  { id: "BSe_BeNk5cA", category: "design" },
  { id: "78OnsENsVbI", category: "design" },
  { id: "Eq0ddl7RFCs", category: "showcase" },
  { id: "9-3RLq9jF20", category: "showcase" },
  { id: "6csKwydOIBc", category: "showcase" },
];

// Define short videos with their categories (YouTube Shorts)
const shortVideoIds = [
  { id: "Z5lYrt-HJZc", category: "quick-tips" },
  { id: "tz-AIcSueAc", category: "quick-tips" },
  { id: "7tfzqUO9WU0", category: "quick-tips" },
  { id: "owhawNRDqcE", category: "inspiration" },
  { id: "v0Z9ZNfrHIU", category: "inspiration" },
];

/**
 * Format a date relative to now (e.g., "2 months ago")
 * @param {Date} datePublished - Date to format
 * @returns {string} Formatted date string
 */
function formatRelativeDate(datePublished) {
  const now = new Date();
  const diffMs = now - datePublished;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);
  
  if (diffYears > 0) {
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  } else if (diffMonths > 0) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  } else if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffMinutes > 0) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Format view count with appropriate suffixes (K, M)
 * @param {number} viewCount - Number of views
 * @returns {string} Formatted view count
 */
function formatViewCount(viewCount) {
  if (viewCount >= 1000000) {
    return `${(viewCount / 1000000).toFixed(1)}M views`;
  } else if (viewCount >= 1000) {
    return `${(viewCount / 1000).toFixed(1)}K views`;
  } else {
    return `${viewCount} views`;
  }
}

/**
 * Create a video card HTML for a lesson video
 * @param {Object} video - Video data object
 * @returns {string} HTML for the video card
 */
function createLessonCard(video) {
  const relativeDate = formatRelativeDate(video.publishedAt);
  const viewCount = formatViewCount(video.views);
  
  return `
    <div class="video-card" data-category="${video.category}" data-video-id="${video.id}">
      <div class="thumbnail-container">
        <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail">
        <div class="play-button">
          <i class="fas fa-play"></i>
        </div>
      </div>
      <div class="video-info">
        <h3 class="video-title">${video.title}</h3>
        <div class="video-meta">
          <div class="video-channel">
            <span>${video.channel}</span>
          </div>
          <div class="video-stats">
            <span>${viewCount} • ${relativeDate}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create a video card HTML for a short video (portrait orientation)
 * @param {Object} video - Video data object
 * @returns {string} HTML for the short video card
 */
function createShortCard(video) {
  const relativeDate = formatRelativeDate(video.publishedAt);
  
  return `
    <div class="video-card short-card" data-category="${video.category}" data-video-id="${video.id}">
      <div class="thumbnail-container portrait">
        <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail">
        <div class="play-button">
          <i class="fas fa-play"></i>
        </div>
        <div class="shorts-badge">
          <i class="fas fa-bolt"></i> SHORT
        </div>
      </div>
      <div class="video-info">
        <h3 class="video-title">${video.title}</h3>
        <div class="video-meta">
          <div class="video-channel">
            <span>${video.channel}</span>
          </div>
          <div class="video-stats">
            <span>${relativeDate}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load video data from YouTube API
 * @returns {Promise} Resolves when data is loaded
 */
async function loadVideoDataFromAPI() {
  try {
    // Create comma-separated list of all video IDs
    const allVideoIds = [...lessonVideoIds, ...shortVideoIds].map(v => v.id).join(',');
    
    // Make API request to get video details
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${allVideoIds}&key=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error('YouTube API request failed');
    }
    
    const data = await response.json();
    
    // Process all videos from the API response
    const processedVideos = data.items.map(item => {
      // Determine if this is a lesson or short video
      const isShort = shortVideoIds.some(v => v.id === item.id);
      
      // Find the video's category
      const categoryInfo = isShort 
        ? shortVideoIds.find(v => v.id === item.id)
        : lessonVideoIds.find(v => v.id === item.id);
      
      const category = categoryInfo?.category || 'uncategorized';
      
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description || 'No description available',
        channel: item.snippet.channelTitle,
        thumbnail: isShort 
          ? `https://img.youtube.com/vi/${item.id}/maxresdefault.jpg` // Higher res for shorts
          : `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
        publishedAt: new Date(item.snippet.publishedAt),
        views: parseInt(item.statistics.viewCount || '0'),
        likes: parseInt(item.statistics.likeCount || '0'),
        category: category,
        isShort: isShort
      };
    });
    
    // Separate lessons and shorts
    lessonVideos = processedVideos.filter(v => !v.isShort);
    shortVideos = processedVideos.filter(v => v.isShort);
    
    console.log(`Loaded ${lessonVideos.length} lessons and ${shortVideos.length} shorts`);
    
  } catch (error) {
    console.error('Error loading video data from API:', error);
    
    // Create fallback data if API fails
    createFallbackVideoData();
  }
  
  // Initialize the UI regardless of API success
  initializeUI();
}

/**
 * Create fallback video data if API fails
 */
function createFallbackVideoData() {
  // Create basic lesson video data
  lessonVideos = lessonVideoIds.map(v => ({
    id: v.id,
    title: `Typography Lesson - ${v.id}`,
    description: 'Video description not available',
    channel: 'Typography Channel',
    thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
    publishedAt: new Date(Date.now() - Math.random() * 31536000000), // Random date within the last year
    views: Math.floor(1000 + Math.random() * 999000), // Random views between 1K and 1M
    likes: Math.floor(100 + Math.random() * 9900), // Random likes
    category: v.category,
    isShort: false
  }));
  
  // Create basic shorts video data
  shortVideos = shortVideoIds.map(v => ({
    id: v.id,
    title: `Typography Short - ${v.id}`,
    description: 'Short video description not available',
    channel: 'Typography Shorts',
    thumbnail: `https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`,
    publishedAt: new Date(Date.now() - Math.random() * 7776000000), // Random date within the last 3 months
    views: Math.floor(5000 + Math.random() * 995000), // Random views between 5K and 1M
    likes: Math.floor(500 + Math.random() * 9500), // Random likes
    category: v.category,
    isShort: true
  }));
}

/**
 * Initialize the UI for both lessons and shorts sections
 */
function initializeUI() {
  // Set up event listeners for category tabs
  setupCategoryTabs('lessons');
  setupCategoryTabs('shorts');
  
  // Load initial videos
  loadLessonsGrid('all-lessons');
  loadShortsGrid('all-shorts');
  
  // Set up show more buttons
  document.getElementById('show-more-lessons').addEventListener('click', () => {
    loadedLessonsRows += ROWS_TO_SHOW_MORE;
    const activeCategory = document.querySelector('#lessons-section .category-tab.active').dataset.category;
    loadLessonsGrid(activeCategory);
  });
  
  document.getElementById('show-more-shorts').addEventListener('click', () => {
    loadedShortsRows += ROWS_TO_SHOW_MORE;
    const activeCategory = document.querySelector('#shorts-section .category-tab.active').dataset.category;
    loadShortsGrid(activeCategory);
  });
  
  // Set up overlay functionality
  document.getElementById('close-overlay').addEventListener('click', closeVideoOverlay);
  document.getElementById('video-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeVideoOverlay();
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeVideoOverlay();
  });
}

/**
 * Set up category tabs for filtering videos
 * @param {string} section - Section identifier ('lessons' or 'shorts')
 */
function setupCategoryTabs(section) {
  const tabs = document.querySelectorAll(`#${section}-section .category-tab`);
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Load videos for the selected category
      const category = tab.dataset.category;
      if (section === 'lessons') {
        loadedLessonsRows = INITIAL_ROWS; // Reset to initial rows
        loadLessonsGrid(category);
      } else {
        loadedShortsRows = INITIAL_ROWS; // Reset to initial rows
        loadShortsGrid(category);
      }
    });
  });
}

/**
 * Load and display videos for the lessons grid
 * @param {string} category - Category filter to apply
 */
function loadLessonsGrid(category) {
  const grid = document.getElementById('lessons-grid');
  const showMoreButton = document.getElementById('show-more-lessons');
  
  // Show loading state
  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  
  // Filter videos by category
  let filteredVideos = lessonVideos;
  if (category !== 'all-lessons') {
    filteredVideos = lessonVideos.filter(video => video.category === category);
  }
  
  // Calculate visible videos
  const visibleVideos = filteredVideos.slice(0, loadedLessonsRows * VIDEOS_PER_ROW);
  
  // Generate HTML
  if (visibleVideos.length > 0) {
    const videosHTML = visibleVideos.map(createLessonCard).join('');
    grid.innerHTML = videosHTML;
    
    // Add click event for each video card
    grid.querySelectorAll('.video-card').forEach(card => {
      card.addEventListener('click', handleVideoCardClick);
    });
    
    // Show/hide "Show More" button
    if (visibleVideos.length < filteredVideos.length) {
      showMoreButton.style.display = 'flex';
    } else {
      showMoreButton.style.display = 'none';
    }
  } else {
    grid.innerHTML = '<p class="no-videos">No videos found for this category</p>';
    showMoreButton.style.display = 'none';
  }
}

/**
 * Load and display videos for the shorts grid
 * @param {string} category - Category filter to apply
 */
function loadShortsGrid(category) {
  const grid = document.getElementById('shorts-grid');
  const showMoreButton = document.getElementById('show-more-shorts');
  
  // Show loading state
  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  
  // Filter videos by category
  let filteredVideos = shortVideos;
  if (category !== 'all-shorts') {
    filteredVideos = shortVideos.filter(video => video.category === category);
  }
  
  // Calculate visible videos
  const visibleVideos = filteredVideos.slice(0, loadedShortsRows * VIDEOS_PER_ROW);
  
  // Generate HTML
  if (visibleVideos.length > 0) {
    const videosHTML = visibleVideos.map(createShortCard).join('');
    grid.innerHTML = videosHTML;
    
    // Add click event for each video card
    grid.querySelectorAll('.video-card').forEach(card => {
      card.addEventListener('click', handleVideoCardClick);
    });
    
    // Show/hide "Show More" button
    if (visibleVideos.length < filteredVideos.length) {
      showMoreButton.style.display = 'flex';
    } else {
      showMoreButton.style.display = 'none';
    }
  } else {
    grid.innerHTML = '<p class="no-videos">No videos found for this category</p>';
    showMoreButton.style.display = 'none';
  }
}

/**
 * Handle click on a video card
 * @param {Event} e - Click event
 */
function handleVideoCardClick(e) {
  e.preventDefault();
  const videoId = this.dataset.videoId;
  
  // Find the video data
  const video = [...lessonVideos, ...shortVideos].find(v => v.id === videoId);
  if (video) {
    openVideoOverlay(video);
  }
}

/**
 * Open the video overlay and play the video
 * @param {Object} video - Video data object
 */
function openVideoOverlay(video) {
  currentVideoData = video;
  
  // Update overlay content
  document.getElementById('overlay-title').textContent = video.title;
  document.getElementById('overlay-channel').textContent = video.channel;
  document.getElementById('overlay-meta').textContent = 
    `${formatViewCount(video.views)} • ${formatRelativeDate(video.publishedAt)}`;
  
  // Create iframe for YouTube video
  const playerContainer = document.getElementById('youtube-player');
  const sessionId = Math.random().toString(36).substring(2, 15); // Random session ID
  
  // Use appropriate embed parameters for shorts vs regular videos
  const embedUrl = video.isShort 
    ? `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&loop=1&playlist=${video.id}&si=${sessionId}`
    : `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&si=${sessionId}`;
  
  playerContainer.innerHTML = `
    <iframe 
      width="100%" 
      height="100%" 
      src="${embedUrl}" 
      title="${video.title}"
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
      allowfullscreen>
    </iframe>
  `;
  
  // Show overlay
  document.getElementById('video-overlay').classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent scrolling
}

/**
 * Close the video overlay
 */
function closeVideoOverlay() {
  // Clear the player
  document.getElementById('youtube-player').innerHTML = '';
  
  // Hide overlay
  document.getElementById('video-overlay').classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
  
  currentVideoData = null;
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', loadVideoDataFromAPI);