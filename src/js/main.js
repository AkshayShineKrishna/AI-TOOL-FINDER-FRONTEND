const API_BASE_URL = 'http://localhost:8080/tools';
let allTools = [];

// Theme management
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const html = document.documentElement;

// Initialize theme from localStorage or system preference
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(theme);
}

// Set theme
function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// Toggle theme
function toggleTheme() {
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Event listener for theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Fetch tools from backend
async function fetchTools() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Handle ToolsResponse structure
        if (data.tools && Array.isArray(data.tools)) {
            allTools = data.tools;
            displayTools(allTools);
        } else if (data.message) {
            // Backend returned a message (no tools)
            displayError(data.message);
        } else {
            displayError('Unexpected response format from server');
        }
    } catch (error) {
        displayError('Failed to load AI tools. Please make sure the backend server is running.');
        console.error('Error fetching tools:', error);
    }
}

// Display tools in the grid
function displayTools(tools) {
    const contentDiv = document.getElementById('content');
    
    if (tools.length === 0) {
        contentDiv.innerHTML = '<div class="no-results">No AI tools found</div>';
        return;
    }

    const toolsGrid = document.createElement('div');
    toolsGrid.className = 'tools-grid';

    tools.forEach(tool => {
        const card = createToolCard(tool);
        toolsGrid.appendChild(card);
    });

    contentDiv.innerHTML = '';
    contentDiv.appendChild(toolsGrid);
}

// Create a tool card
function createToolCard(tool) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    
    // Handle rating
    const rating = formatRating(tool.rating ?? tool.averageRating);

    // Use pricingType field from backend
    const pricingType = tool.pricingType || 'N/A';
    let pricingClass = 'paid'; // default
    if (pricingType.toLowerCase() === 'free') pricingClass = 'free';
    else if (pricingType.toLowerCase() === 'subscription') pricingClass = 'subscription';

    card.innerHTML = `
        <div class="tool-header">
            <div class="tool-name-row">
                <h2 class="tool-name">${tool.name || 'Unnamed Tool'}</h2>
                ${rating !== 'N/A' ? `<span class="rating">⭐ ${rating}</span>` : ''}
            </div>
            <div class="tool-info">
                <div class="tool-left">
                    <span class="tool-category">${tool.category || 'General'}</span>
                    <span class="pricing-badge ${pricingClass}">${pricingType}</span>
                </div>
                <button class="reviews-btn" onclick="openReviewModal('${tool.id}', '${tool.name}')">
                    Add Review
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14m7-7H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    return card;
}

// Display error message
function displayError(message) {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `<div class="error">${message}</div>`;
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    applyFiltersAndSearch(searchTerm);
});

// Filter state
let activeFilters = {
    pricing: ['FREE', 'PAID', 'SUBSCRIPTION'],
    minRating: 0,
    categories: []
};

// Populate categories dynamically
function populateCategories() {
    const categories = [...new Set(allTools.map(tool => tool.category).filter(Boolean))];
    const categoryButtons = document.getElementById('categoryButtons');
    
    if (categories.length === 0) {
        categoryButtons.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.9rem;">No categories available</span>';
        return;
    }
    
    categoryButtons.innerHTML = categories.map(cat => 
        `<button class="filter-tag" data-value="${cat}" onclick="toggleFilterButton(this, 'category')">${cat}</button>`
    ).join('');
}

// Toggle filter button
function toggleFilterButton(button, type) {
    if (type === 'pricing' || type === 'category') {
        // Multi-select for pricing and categories
        button.classList.toggle('active');
    } else if (type === 'rating') {
        // Single-select for rating
        document.querySelectorAll('#ratingButtons .filter-tag').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
    }
}

// Display active filters
function updateActiveFiltersDisplay() {
    const container = document.getElementById('activeFiltersContainer');
    const filtersList = document.getElementById('activeFiltersList');
    const tags = [];
    
    // Add pricing filters (only if not all selected)
    const allPricing = ['FREE', 'PAID', 'SUBSCRIPTION'];
    if (activeFilters.pricing.length > 0 && activeFilters.pricing.length < allPricing.length) {
        activeFilters.pricing.forEach(pricing => {
            const displayName = pricing.charAt(0) + pricing.slice(1).toLowerCase();
            tags.push(`<span class="filter-chip"><span>${displayName}</span><button onclick="removeFilter('pricing', '${pricing}')" aria-label="Remove ${displayName}">×</button></span>`);
        });
    }
    
    // Add rating filter (only if not "All")
    if (activeFilters.minRating > 0) {
        tags.push(`<span class="filter-chip"><span>⭐ ${activeFilters.minRating}+</span><button onclick="removeFilter('rating', ${activeFilters.minRating})" aria-label="Remove rating filter">×</button></span>`);
    }
    
    // Add category filters
    if (activeFilters.categories && activeFilters.categories.length > 0) {
        activeFilters.categories.forEach(cat => {
            tags.push(`<span class="filter-chip"><span>${cat}</span><button onclick="removeFilter('category', '${cat}')" aria-label="Remove ${cat}">×</button></span>`);
        });
    }
    
    // Show or hide container based on active filters
    if (tags.length > 0) {
        filtersList.innerHTML = tags.join('');
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// Remove individual filter
function removeFilter(type, value) {
    if (type === 'pricing') {
        activeFilters.pricing = activeFilters.pricing.filter(p => p !== value);
        // Update button state in modal
        const button = document.querySelector(`#pricingButtons .filter-tag[data-value="${value}"]`);
        if (button) button.classList.remove('active');
    } else if (type === 'rating') {
        activeFilters.minRating = 0;
        // Update button state in modal
        document.querySelectorAll('#ratingButtons .filter-tag').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === '0');
        });
    } else if (type === 'category') {
        activeFilters.categories = activeFilters.categories.filter(c => c !== value);
        // Update button state in modal
        const button = document.querySelector(`#categoryButtons .filter-tag[data-value="${value}"]`);
        if (button) button.classList.remove('active');
    }
    
    applyFiltersAndSearch(document.getElementById('searchInput').value.toLowerCase().trim());
    updateActiveFiltersDisplay();
}

// Clear all filters
function clearAllFilters() {
    // Reset pricing buttons
    document.querySelectorAll('#pricingButtons .filter-tag').forEach(btn => {
        btn.classList.add('active');
    });
    
    // Reset category buttons
    document.querySelectorAll('#categoryButtons .filter-tag').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Reset rating buttons
    document.querySelectorAll('#ratingButtons .filter-tag').forEach((btn, index) => {
        if (index === 0) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Reset filter state
    activeFilters = {
        pricing: ['FREE', 'PAID', 'SUBSCRIPTION'],
        minRating: 0,
        categories: []
    };
    
    // Apply filters
    applyFiltersAndSearch(document.getElementById('searchInput').value.toLowerCase().trim());
    updateActiveFiltersDisplay();
}

// Filter modal functions
function openFilterModal() {
    populateCategories();
    document.getElementById('filterModal').classList.remove('hidden');
}

function closeFilterModal() {
    document.getElementById('filterModal').classList.add('hidden');
}

function clearFilters() {
    // Reset pricing buttons - set all to active
    document.querySelectorAll('#pricingButtons .filter-tag').forEach(btn => {
        btn.classList.add('active');
    });
    
    // Reset category buttons - remove all active
    document.querySelectorAll('#categoryButtons .filter-tag').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Reset rating buttons - set "All" to active
    document.querySelectorAll('#ratingButtons .filter-tag').forEach((btn, index) => {
        if (index === 0) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Reset filter state
    activeFilters = {
        pricing: ['FREE', 'PAID', 'SUBSCRIPTION'],
        minRating: 0,
        categories: []
    };
    
    // Apply filters
    applyFiltersAndSearch(document.getElementById('searchInput').value.toLowerCase().trim());
    closeFilterModal();
}

function applyFilters() {
    // Get pricing selections from active buttons
    const pricing = [];
    document.querySelectorAll('#pricingButtons .filter-tag.active').forEach(btn => {
        pricing.push(btn.dataset.value);
    });
    
    // Get rating selection from active button
    const activeRating = document.querySelector('#ratingButtons .filter-tag.active');
    const minRating = activeRating ? parseFloat(activeRating.dataset.value) : 0;
    
    // Get category selections from active buttons
    const categories = [];
    document.querySelectorAll('#categoryButtons .filter-tag.active').forEach(btn => {
        categories.push(btn.dataset.value);
    });
    
    // Update filter state
    activeFilters = {
        pricing,
        minRating,
        categories
    };
    
    // Apply filters with current search term
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    applyFiltersAndSearch(searchTerm);
    updateActiveFiltersDisplay();
    
    closeFilterModal();
}

function applyFiltersAndSearch(searchTerm = '') {
    let filtered = allTools;
    
    // Apply pricing filter
    if (activeFilters.pricing.length > 0) {
        filtered = filtered.filter(tool => {
            const pricingType = (tool.pricingType || 'PAID').toUpperCase();
            return activeFilters.pricing.includes(pricingType);
        });
    }
    
    // Apply rating filter
    if (activeFilters.minRating > 0) {
        filtered = filtered.filter(tool => {
            const rating = tool.rating || tool.averageRating || 0;
            return rating >= activeFilters.minRating;
        });
    }
    
    // Apply category filter (show tools matching any selected category)
    if (activeFilters.categories && activeFilters.categories.length > 0) {
        filtered = filtered.filter(tool => {
            const toolCategory = tool.category || '';
            return activeFilters.categories.includes(toolCategory);
        });
    }
    
    // Apply search term
    if (searchTerm) {
        filtered = filtered.filter(tool => {
            const name = (tool.name || '').toLowerCase();
            const category = (tool.category || '').toLowerCase();
            const pricingType = (tool.pricingType || '').toLowerCase();
            return name.includes(searchTerm) || category.includes(searchTerm) || pricingType.includes(searchTerm);
        });
    }
    
    displayTools(filtered);
}

// Review modal functions
let currentToolId = null;
let currentToolName = null;

function setReviewStatus(message = '', type = '') {
    const el = document.getElementById('reviewStatusMessage');
    if (!el) return;
    el.textContent = message;
    el.style.color = type === 'error' ? 'var(--error-bg)' : type === 'success' ? 'var(--success)' : 'var(--text-secondary)';
}

function updateCharCount() {
    const textarea = document.getElementById('reviewComment');
    const display = document.getElementById('wordCountDisplay');
    const length = textarea.value.trim().length;
    const charsLeft = 50 - length;
    if (charsLeft < 0) {
        display.textContent = `${Math.abs(charsLeft)} characters over limit`;
        display.style.color = 'var(--error-bg)';
    } else {
        display.textContent = `${charsLeft} characters left`;
        display.style.color = charsLeft <= 5 ? '#eab308' : 'var(--text-secondary)';
    }
}

function selectReviewRating(button) {
    // Remove active class from all rating buttons
    document.querySelectorAll('#reviewRatingButtons .filter-tag').forEach(btn => {
        btn.classList.remove('active');
    });
    // Add active class to selected button
    button.classList.add('active');
}

function openReviewModal(toolId, toolName) {
    currentToolId = toolId;
    currentToolName = toolName;
    setReviewStatus('');
    document.getElementById('reviewToolName').textContent = toolName;
    document.getElementById('reviewModal').classList.remove('hidden');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.add('hidden');
    // Reset rating buttons to default (5 stars)
    document.querySelectorAll('#reviewRatingButtons .filter-tag').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === '5') {
            btn.classList.add('active');
        }
    });
    document.getElementById('reviewComment').value = '';
    setReviewStatus('');
    updateCharCount();
}

async function submitReview() {
    setReviewStatus('');
    const activeRatingBtn = document.querySelector('#reviewRatingButtons .filter-tag.active');
    const rating = activeRatingBtn ? parseInt(activeRatingBtn.dataset.value, 10) : 5;
    const comment = document.getElementById('reviewComment').value.trim();

    if (!currentToolId) {
        setReviewStatus('Missing tool selection.', 'error');
        return;
    }
    if (rating < 1 || rating > 5) {
        setReviewStatus('Please select a rating between 1 and 5.', 'error');
        return;
    }
    if (comment.length < 5 || comment.length > 50) {
        setReviewStatus('Comment must be between 5 and 50 characters.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolId: currentToolId, rating, comment })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg = payload.message || (Array.isArray(payload.errors) ? payload.errors.join('; ') : 'Failed to submit review.');
            setReviewStatus(msg, 'error');
            return;
        }

        setReviewStatus('Review submitted successfully!', 'success');
        fetchTools();
        setTimeout(() => closeReviewModal(), 800);
    } catch (error) {
        console.error('Error submitting review:', error);
        setReviewStatus('Failed to submit review. Please try again.', 'error');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const reviewModal = document.getElementById('reviewModal');
    const filterModal = document.getElementById('filterModal');
    
    if (event.target === reviewModal) {
        closeReviewModal();
    }
    
    if (event.target === filterModal) {
        closeFilterModal();
    }
});

// Initialize
initTheme();
fetchTools();

function formatRating(value) {
    const num = Number(value);
    return Number.isNaN(num) ? 'N/A' : num.toFixed(1);
}
