document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // State & Variables
    // ==========================================================================
    let releaseNotes = [];
    let selectedNoteId = null;
    let activeCategory = 'all';
    let searchQuery = '';

    // ==========================================================================
    // DOM Elements
    // ==========================================================================
    const refreshBtn = document.getElementById('refresh-btn');
    const retryBtn = document.getElementById('retry-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    const searchInput = document.getElementById('search-input');
    const categoryPillsContainer = document.getElementById('category-pills');
    const notesContainer = document.getElementById('notes-container');
    
    // States
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    
    // Metadata stats
    const lastCheckedTime = document.getElementById('last-checked-time');
    const feedStatus = document.getElementById('feed-status');
    const countAll = document.getElementById('count-all');

    // Theme Toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeText = document.getElementById('theme-text');

    // Tweet Composer
    const tweetSidebar = document.getElementById('tweet-sidebar');
    const closeComposerBtn = document.getElementById('close-composer-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const charProgress = document.getElementById('char-progress');
    const tweetBtn = document.getElementById('tweet-btn');
    
    // Mock Tweet Preview
    const mockTweetText = document.getElementById('mock-tweet-text');
    const mockCardLink = document.getElementById('mock-card-link');
    const mockCardTitle = document.getElementById('mock-card-title');
    const mockCardDesc = document.getElementById('mock-card-desc');

    // ==========================================================================
    // Theme Toggle Logic
    // ==========================================================================
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeUI(newTheme);
        showToast(`Switched to ${newTheme} mode`, 'success');
    });

    function updateThemeUI(theme) {
        if (theme === 'dark') {
            themeText.textContent = 'Light Mode';
        } else {
            themeText.textContent = 'Dark Mode';
        }
    }

    // ==========================================================================
    // API Fetch & Loading Logic
    // ==========================================================================
    async function loadReleaseNotes(forceRefresh = false) {
        // Show loading state
        showSection(loadingState);
        hideSection(notesContainer);
        hideSection(errorState);
        hideSection(emptyState);
        
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;

        try {
            const response = await fetch(`/api/release-notes?force_refresh=${forceRefresh}`);
            const result = await response.json();

            if (result.success) {
                releaseNotes = result.data;
                
                // Update UI metadata
                lastCheckedTime.textContent = result.last_updated;
                
                // Update feed status badge style
                feedStatus.textContent = result.status;
                feedStatus.className = 'stat-val status-badge';
                if (result.status === 'fresh') {
                    feedStatus.classList.add('fresh');
                    showToast('Fetched latest feed successfully', 'success');
                } else {
                    feedStatus.classList.add('cached');
                    if (forceRefresh) {
                        showToast('Feed is already up to date', 'success');
                    }
                }

                // Render notes and categories
                renderCategoryPills();
                filterAndRenderNotes();
            } else {
                throw new Error(result.error || 'Failed to fetch release notes from server.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            errorMessage.textContent = error.message;
            feedStatus.textContent = 'Error';
            feedStatus.className = 'stat-val status-badge error';
            
            showSection(errorState);
            hideSection(loadingState);
            showToast('Failed to load release notes feed', 'error');
        } finally {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }

    // Helper to toggle visible sections
    function showSection(element) {
        element.classList.remove('hidden');
    }

    function hideSection(element) {
        element.classList.add('hidden');
    }

    // ==========================================================================
    // Filter & Render Logic
    // ==========================================================================
    function renderCategoryPills() {
        // Count entries per category
        const counts = { all: releaseNotes.length };
        releaseNotes.forEach(note => {
            const cat = note.category.toLowerCase();
            counts[cat] = (counts[cat] || 0) + 1;
        });

        // Update total count pill
        countAll.textContent = counts.all;

        // Collect unique categories in feed, sort alphabetically
        const categories = [...new Set(releaseNotes.map(n => n.category))].sort();

        // Preserving active state selection
        const previousActiveCategory = activeCategory;

        // Build HTML for dynamic categories
        let pillsHtml = `
            <button class="pill ${activeCategory === 'all' ? 'active' : ''}" data-category="all">
                <span class="pill-dot"></span>
                <span class="pill-label">All Updates</span>
                <span class="pill-count">${counts.all}</span>
            </button>
        `;

        categories.forEach(cat => {
            const catLower = cat.toLowerCase();
            const count = counts[catLower] || 0;
            pillsHtml += `
                <button class="pill ${activeCategory === catLower ? 'active' : ''}" data-category="${catLower}">
                    <span class="pill-dot"></span>
                    <span class="pill-label">${cat}</span>
                    <span class="pill-count">${count}</span>
                </button>
            `;
        });

        categoryPillsContainer.innerHTML = pillsHtml;

        // Attach listeners to newly created pills
        const pills = categoryPillsContainer.querySelectorAll('.pill');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                activeCategory = pill.getAttribute('data-category');
                filterAndRenderNotes();
            });
        });
    }

    function filterAndRenderNotes() {
        // Apply category filter and search query filter
        const filtered = releaseNotes.filter(note => {
            const matchesCategory = activeCategory === 'all' || note.category.toLowerCase() === activeCategory;
            
            const rawTitleMatch = note.title.toLowerCase().includes(searchQuery);
            const contentMatch = note.content.toLowerCase().includes(searchQuery);
            const matchesSearch = searchQuery === '' || rawTitleMatch || contentMatch;
            
            return matchesCategory && matchesSearch;
        });

        // Render notes
        if (filtered.length === 0) {
            showSection(emptyState);
            hideSection(notesContainer);
        } else {
            hideSection(emptyState);
            showSection(notesContainer);
            
            notesContainer.innerHTML = filtered.map(note => {
                const isSelected = selectedNoteId === note.id;
                const dateFormatted = formatDate(note.updated);
                const categoryClass = getCategoryBadgeClass(note.category);
                
                return `
                    <article class="release-card ${isSelected ? 'selected' : ''}" data-id="${note.id}">
                        <div class="card-header">
                            <div class="card-meta-left">
                                <span class="badge ${categoryClass}">${note.category}</span>
                                <span class="card-date">${dateFormatted}</span>
                            </div>
                            <button class="card-selector" aria-label="Select update to tweet">
                                <svg class="selector-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </button>
                        </div>
                        <div class="card-body">
                            <h3>${note.title}</h3>
                            <div class="card-body-content">${note.content}</div>
                        </div>
                        <div class="card-footer">
                            <a href="${note.link || 'https://cloud.google.com/bigquery/docs/release-notes'}" target="_blank" rel="noopener noreferrer" class="btn-card-link" onclick="event.stopPropagation();">
                                <span>Official Docs</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                </svg>
                            </a>
                            <button class="btn-tweet-action" aria-label="Tweet about this update">
                                <svg viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <span>Draft Post</span>
                            </button>
                        </div>
                    </article>
                `;
            }).join('');

            // Attach click listeners to cards and tweet buttons
            const cards = notesContainer.querySelectorAll('.release-card');
            cards.forEach(card => {
                const noteId = card.getAttribute('data-id');
                const note = releaseNotes.find(n => n.id === noteId);

                // Entire card click toggles selection
                card.addEventListener('click', () => {
                    toggleSelectNote(note);
                });

                // Tweet button click does same but focuses composition
                const tweetActionBtn = card.querySelector('.btn-tweet-action');
                tweetActionBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectNoteAndOpenComposer(note);
                });
            });
        }
    }

    // Helper functions for layouts
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    function getCategoryBadgeClass(category) {
        const cat = category.toLowerCase();
        if (cat.includes('feature')) return 'badge-feature';
        if (cat.includes('announc')) return 'badge-announcement';
        if (cat.includes('deprecat')) return 'badge-deprecation';
        if (cat.includes('chang')) return 'badge-changed';
        if (cat.includes('fix') || cat.includes('resolv')) return 'badge-fixed';
        return 'badge-general';
    }

    // ==========================================================================
    // Selection & Tweet Composer Integrations
    // ==========================================================================
    function toggleSelectNote(note) {
        if (selectedNoteId === note.id) {
            // Unselect
            selectedNoteId = null;
            closeComposer();
            filterAndRenderNotes();
        } else {
            // Select
            selectNoteAndOpenComposer(note);
        }
    }

    function selectNoteAndOpenComposer(note) {
        selectedNoteId = note.id;
        
        // Render notes to show the selected border
        filterAndRenderNotes();
        
        // Generate pre-populated Tweet draft
        generateTweetDraft(note);
        
        // Open composer sidebar
        tweetSidebar.classList.add('open');
    }

    function generateTweetDraft(note) {
        // Strip HTML tag helper
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        let plainContent = tempDiv.textContent || tempDiv.innerText || '';
        
        // Clean double lines
        plainContent = plainContent.trim().replace(/\n\s*\n/g, '\n');

        const titleText = note.title;
        const noteLink = note.link || 'https://cloud.google.com/bigquery/docs/release-notes';
        
        // We compose a neat draft fit for 280 characters:
        // Format: 🚀 BigQuery Update: Title \n\n Content (trimmed) \n\n #GoogleCloud #BigQuery [Link]
        const header = `🚀 BigQuery Update: ${titleText}\n\n`;
        const footer = `\n\n#GoogleCloud #BigQuery ${noteLink}`;
        
        const remainingForContent = 280 - header.length - footer.length;
        
        let trimmedContent = plainContent;
        if (plainContent.length > remainingForContent) {
            trimmedContent = plainContent.substring(0, remainingForContent - 4) + '...';
        }
        
        const draftText = `${header}${trimmedContent}${footer}`;
        
        // Populate textarea and trigger update
        tweetTextarea.value = draftText;
        updateTweetLengthUI(draftText, note);
    }

    function updateTweetLengthUI(text, note) {
        const len = text.length;
        charCounter.textContent = `${len} / 280`;

        // Calculate progress percentage
        const percentage = Math.min((len / 280) * 100, 100);
        charProgress.style.width = `${percentage}%`;

        // Color coding class for counter
        charProgress.className = 'char-progress-bar';
        if (len > 280) {
            charProgress.classList.add('danger');
            charCounter.style.color = 'var(--color-deprecation)';
            tweetBtn.disabled = true;
            tweetBtn.classList.add('disabled');
        } else if (len > 250) {
            charProgress.classList.add('warning');
            charCounter.style.color = 'var(--color-announcement)';
            tweetBtn.disabled = false;
            tweetBtn.classList.remove('disabled');
        } else {
            charCounter.style.color = 'var(--text-muted)';
            tweetBtn.disabled = false;
            tweetBtn.classList.remove('disabled');
        }

        // Live Twitter preview details
        mockTweetText.textContent = text;

        // Render mockup card link if card is selected
        if (note) {
            mockCardLink.classList.remove('hidden');
            mockCardTitle.textContent = note.title;
            
            // Strip tags for card snippet
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.content;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            mockCardDesc.textContent = textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;
        } else {
            mockCardLink.classList.add('hidden');
        }
    }

    function closeComposer() {
        tweetSidebar.classList.remove('open');
        selectedNoteId = null;
        
        // Remove class select highlight on cards
        const cards = notesContainer.querySelectorAll('.release-card');
        cards.forEach(c => c.classList.remove('selected'));
    }

    // ==========================================================================
    // Event Listeners
    // ==========================================================================
    
    // Search updates filter
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterAndRenderNotes();
    });

    // Clear filters and searches
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        activeCategory = 'all';
        renderCategoryPills();
        filterAndRenderNotes();
    });

    // Refresh action trigger
    refreshBtn.addEventListener('click', () => {
        loadReleaseNotes(true);
    });

    // Retry on error view
    retryBtn.addEventListener('click', () => {
        loadReleaseNotes(true);
    });

    // Drawer close buttons
    closeComposerBtn.addEventListener('click', closeComposer);

    // Textarea editing update preview
    tweetTextarea.addEventListener('input', (e) => {
        const text = e.target.value;
        const currentNote = releaseNotes.find(n => n.id === selectedNoteId);
        updateTweetLengthUI(text, currentNote);
    });

    // Tweet Click Action
    tweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length > 280) {
            showToast('Post exceeds the 280 character limit', 'error');
            return;
        }

        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        showToast('Opened X / Twitter sharing tab', 'success');
    });

    // ==========================================================================
    // Toast Notification Utility
    // ==========================================================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const successIcon = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
        `;
        
        const errorIcon = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;

        toast.innerHTML = `
            ${type === 'success' ? successIcon : errorIcon}
            <div class="toast-content">${message}</div>
        `;
        
        container.appendChild(toast);
        
        // Remove toast after 4s
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 4000);
    }

    // ==========================================================================
    // App Initialization
    // ==========================================================================
    // Load initial list from cache/server on load
    loadReleaseNotes(false);
});
