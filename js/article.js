// Function to get URL parameters
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Function to load article content
async function loadArticle() {
  try {
    // Get the article ID from the URL
    const articleId = getUrlParameter('id');
    
    if (!articleId) {
      throw new Error('Article ID is missing from the URL');
    }
    
    // Get the image container element
    const imageContainer = document.getElementById('article-image-container');
    
    // Create the image element
    const articleImage = document.createElement('img');
    articleImage.src = `images/articles/${articleId}.png`; // Use the ID to construct the image path
    articleImage.alt = `Article: ${articleId}`; // Set alt text
    articleImage.className = 'w-full'; // Make the image responsive
    
    // Add error handling for the image
    articleImage.onerror = () => {
      // Display a "not available in demo" message
      imageContainer.innerHTML = `
        <div class="not-available-message p-20 text-center">
          <h2 class="text-3xl mb-6 font-light">This article is not available in the demo</h2>
          <p class="text-lg mb-8">The requested article content is not included in this demonstration version.</p>
        </div>
      `;
    };
    
    // Add the image to the container
    imageContainer.appendChild(articleImage);
    
    // Update page title if needed
    document.title = `${articleId.replace(/-/g, ' ')} | Typelab`;
    
  } catch (error) {
    console.error('Error loading article:', error);
    // Display an error message
    const imageContainer = document.getElementById('article-image-container');
    imageContainer.innerHTML = `
      <div class="not-available-message p-20 text-center">
        <h2 class="text-3xl mb-6 font-light">This article is not available in the demo</h2>
        <p class="text-lg mb-8">The requested article content is not included in this demonstration version.</p>
        <a href="read.html" class="px-6 py-3 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">
          Return to Articles
        </a>
      </div>
    `;
  }
}

// Initialize the page when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  loadArticle();
});
