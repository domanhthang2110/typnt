// Function to fetch articles from JSON file
async function fetchArticles() {
  try {
    const response = await fetch('data/articles.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

// Function to create a URL-friendly slug from a title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .trim();                  // Trim leading/trailing spaces or hyphens
}

// Current active category
let currentCategory = 'all'; // Changed from 'articles' to 'all'
let currentSearchTerm = ''; // For search filtering

// Function to render articles in the grid
async function renderArticles(category = currentCategory, searchTerm = currentSearchTerm) {
  const articlesContainer = document.getElementById('articles-grid');
  articlesContainer.innerHTML = ''; // Clear the container
  
  const articles = await fetchArticles();
  
  // Filter articles based on category
  let filteredArticles;
  if (category === 'all') {
    filteredArticles = articles; // Show all articles
  } else if (category === 'articles') {
    filteredArticles = articles.filter(article => article.category === 'articles');
  } else {
    filteredArticles = articles.filter(article => article.category === 'books' || article.category === 'lectures');
  }
  
  // Further filter by search term if provided
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filteredArticles = filteredArticles.filter(article => 
      article.title.toLowerCase().includes(searchLower)
    );
  }

  // Display message when no results are found
  if (filteredArticles.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.innerHTML = `<p>No results found for "${searchTerm}"</p>`;
    articlesContainer.appendChild(noResults);
    return;
  }
  
  filteredArticles.forEach(article => {
    const articleCard = document.createElement('div');
    articleCard.className = 'article-card';
    
    // Create a slug for the article URL
    const articleSlug = createSlug(article.title);
    const articleUrl = `article.html?id=${articleSlug}`;
    
    articleCard.innerHTML = `
      <div class="thumbnail-container">
        <img src="${article.thumbnail}" alt="${article.title}" class="article-thumbnail">
      </div>
      <div class="content">
        <h3 class="article-title"><a href="${articleUrl}" class="article-link">${article.title}</a></h3>
        <p class="article-description">${article.description}</p>
      </div>
    `;
    
    // Make the entire card clickable
    articleCard.addEventListener('click', (event) => {
      // Only navigate if the click wasn't on the link itself (to prevent double navigation)
      if (!event.target.closest('a')) {
        window.location.href = articleUrl;
      }
    });
    
    articlesContainer.appendChild(articleCard);
  });
}

// Function to handle category toggle
function toggleCategory(category) {
  currentCategory = category;
  renderArticles(category, currentSearchTerm);
  
  // Update active button styles
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`${category}-btn`).classList.add('active');
}

// Handle search input
function handleSearch() {
  const searchInput = document.querySelector('.search-bar input');
  if (searchInput) {
    currentSearchTerm = searchInput.value.trim();
    renderArticles(currentCategory, currentSearchTerm);
  }
}

// Initialize the page when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add category toggle buttons to the second-bar if it exists
  const secondBar = document.querySelector('.second-bar');
  if (secondBar) {
    const categoryToggle = document.createElement('div');
    categoryToggle.className = 'category-toggle';
    categoryToggle.innerHTML = `
    <h3>Categories:</h3>
      <button id="all-btn" class="category-btn active">All</button>
      <button id="articles-btn" class="category-btn">Articles</button>
      <button id="books-lectures-btn" class="category-btn">Books & Lectures</button>
    `;
    secondBar.appendChild(categoryToggle);
    
    // Add event listeners to toggle buttons
    document.getElementById('all-btn').addEventListener('click', () => toggleCategory('all'));
    document.getElementById('articles-btn').addEventListener('click', () => toggleCategory('articles'));
    document.getElementById('books-lectures-btn').addEventListener('click', () => toggleCategory('books-lectures'));
    
    // Add event listeners for search using existing search bar
    const searchInput = document.querySelector('.search-bar input');
    const searchButton = document.querySelector('.search-bar button');
    
    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleSearch();
        }
      });
    }
    
    if (searchButton) {
      searchButton.addEventListener('click', handleSearch);
    }
  }
  
  renderArticles();
});
