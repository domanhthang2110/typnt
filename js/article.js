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
    
    // Add the image to the container
    imageContainer.appendChild(articleImage);
    
    // Update page title if needed
    document.title = `${articleId.replace(/-/g, ' ')} | Typelab`;
    
  } catch (error) {
    console.error('Error loading article:', error);
    // Display an error message
    const imageContainer = document.getElementById('article-image-container');
    imageContainer.innerHTML = `
      <div class="error-message p-10 text-center">
        <h2 class="text-xl mb-4">Article Not Found</h2>
        <p>Sorry, we couldn't find the article you're looking for.</p>
      </div>
    `;
  }
}

// Initialize the page when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  loadArticle();
});
