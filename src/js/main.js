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
    
    const rating = tool.rating || tool.averageRating || 'N/A';
    const pricingType = tool.pricingType || 'N/A';
    const pricingClass = pricingType.toLowerCase() === 'free' ? 'free' : 'paid';

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
                <div style="display:flex; gap:5px;">
                    <button class="reviews-btn" onclick="openReviewModal('${tool.id}')">Add Review</button>
                </div>
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
            
            if (searchTerm === '') {
                displayTools(allTools);
                return;
            }

            const filtered = allTools.filter(tool => {
                const name = (tool.name || '').toLowerCase();
                const category = (tool.category || '').toLowerCase();
                
                return name.includes(searchTerm) || category.includes(searchTerm);
            });

            displayTools(filtered);
        });
// Modal Logic
function openReviewModal(toolId) {
    document.getElementById('modalToolId').value = toolId;
    document.getElementById('reviewModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('reviewModal').style.display = 'none';
    document.getElementById('reviewForm').reset();
}

// Form Submission
document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const reviewData = {
        // Must match your Review.java field names exactly
        toolId: document.getElementById('modalToolId').value, 
        rating: parseFloat(document.getElementById('reviewRating').value),
        comment: document.getElementById('reviewComment').value
    };

    console.log("Payload being sent:", reviewData);

    try {
        const response = await fetch('http://localhost:8080/tools/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(reviewData)
        });

        if (response.ok) {
            alert('Review submitted successfully! It is now pending moderation.');
            closeModal();
            fetchTools(); // Refresh the UI
        } else {
            // This captures your InvalidReviewException message
            const errorData = await response.json();
            console.error("Validation Errors:", errorData);
            alert('Error: ' + (errorData.message || 'Check console for details'));
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('Could not connect to the backend server.');
    }


});



const commentInput = document.getElementById('reviewComment');
const charCount = document.getElementById('charCount');

if (commentInput && charCount) {
    commentInput.addEventListener('input', () => {
        const length = commentInput.value.length;
        charCount.textContent = `${length} / 30`;
        
        // Optional: Visual feedback if requirements aren't met
        if (length < 5 || length > 30) {
            charCount.style.color = 'var(--error-bg)';
        } else {
            charCount.style.color = 'var(--text-secondary)';
        }
    });
}
        // Initialize
        initTheme();
        fetchTools();