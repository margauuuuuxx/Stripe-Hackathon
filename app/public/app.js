// Configuration
const API_BASE_URL = window.location.origin;

// State management
let currentProducts = [];
let currentView = 'grid'; // 'grid' or 'list'
let currentSort = 'name';

// DOM Elements
const elements = {
    urlInput: document.getElementById('urlInput'),
    searchBtn: document.getElementById('searchBtn'),
    loadAllBtn: document.getElementById('loadAllBtn'),
    mockDataBtn: document.getElementById('mockDataBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    searchBtnText: document.getElementById('searchBtnText'),
    searchBtnIcon: document.getElementById('searchBtnIcon'),
    
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    resultsSection: document.getElementById('resultsSection'),
    emptyState: document.getElementById('emptyState'),
    
    errorMessage: document.getElementById('errorMessage'),
    resultsInfo: document.getElementById('resultsInfo'),
    productCount: document.getElementById('productCount'),
    
    productsGrid: document.getElementById('productsGrid'),
    productsList: document.getElementById('productsList'),
    
    sortSelect: document.getElementById('sortSelect'),
    toggleView: document.getElementById('toggleView'),
    viewIcon: document.getElementById('viewIcon'),
    tryAgainBtn: document.getElementById('tryAgainBtn')
};

// Event Listeners
elements.searchBtn.addEventListener('click', handleSearch);
elements.loadAllBtn.addEventListener('click', handleLoadAll);
elements.mockDataBtn.addEventListener('click', handleMockData);
elements.refreshBtn.addEventListener('click', handleRefresh);
elements.tryAgainBtn.addEventListener('click', resetToSearch);
elements.toggleView.addEventListener('click', toggleViewMode);
elements.sortSelect.addEventListener('change', handleSort);

elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Initialize app
window.addEventListener('load', () => {
    console.log('Stripe Product Finder initialized');
    resetToSearch();
});

// Main functions
async function handleSearch() {
    const url = elements.urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a website URL');
        return;
    }

    if (!isValidUrl(url)) {
        showError('Please enter a valid URL (e.g., https://example.com)');
        return;
    }

    console.log('Searching products for URL:', url);
    await searchProducts(url);
}

async function handleLoadAll() {
    console.log('Loading all products');
    await loadAllProducts();
}

async function handleMockData() {
    console.log('Loading mock data for testing');
    await loadMockData();
}

async function handleRefresh() {
    if (currentProducts.length === 0) {
        return;
    }
    
    const url = elements.urlInput.value.trim();
    if (url) {
        await searchProducts(url);
    } else {
        await loadAllProducts();
    }
}

// API functions
async function searchProducts(url) {
    try {
        setLoadingState(true);
        
        const response = await fetch(`${API_BASE_URL}/api/products/by-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch products');
        }

        currentProducts = data.products || [];
        displayResults(data);
        
    } catch (error) {
        console.error('Search error:', error);
        showError(error.message);
    } finally {
        setLoadingState(false);
    }
}

async function loadAllProducts() {
    try {
        setLoadingState(true);
        
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch products');
        }

        currentProducts = data.products || [];
        displayResults(data);
        
    } catch (error) {
        console.error('Load all error:', error);
        showError(error.message);
    } finally {
        setLoadingState(false);
    }
}

async function loadMockData() {
    try {
        setLoadingState(true);
        
        const response = await fetch(`${API_BASE_URL}/api/products/mock`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch mock products');
        }

        currentProducts = data.products || [];
        displayResults(data);
        
    } catch (error) {
        console.error('Mock data error:', error);
        showError(error.message);
    } finally {
        setLoadingState(false);
    }
}

// UI functions
function setLoadingState(loading) {
    elements.searchBtn.disabled = loading;
    elements.loadAllBtn.disabled = loading;
    
    if (loading) {
        elements.searchBtnText.textContent = 'Searching...';
        elements.searchBtnIcon.className = 'fas fa-spinner fa-spin ml-2';
        showSection('loadingState');
    } else {
        elements.searchBtnText.textContent = 'Search Products';
        elements.searchBtnIcon.className = 'fas fa-search ml-2';
    }
}

function showSection(sectionId) {
    // Hide all sections
    ['loadingState', 'errorState', 'resultsSection', 'emptyState'].forEach(id => {
        elements[id].classList.add('hidden');
    });
    
    // Show target section
    if (elements[sectionId]) {
        elements[sectionId].classList.remove('hidden');
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    showSection('errorState');
    updateProductCount(0);
}

function displayResults(data) {
    if (!data.products || data.products.length === 0) {
        showSection('emptyState');
        updateProductCount(0);
        return;
    }

    // Update results info
    const urlText = data.url === 'all' ? 'All products' : `Products from ${data.url}`;
    elements.resultsInfo.textContent = `${urlText} • ${data.products.length} product${data.products.length === 1 ? '' : 's'} found`;
    
    // Sort products
    sortProducts(currentSort);
    
    // Render products
    renderProducts();
    
    showSection('resultsSection');
    updateProductCount(data.products.length);
}

function renderProducts() {
    if (currentView === 'grid') {
        renderProductsGrid();
        elements.productsGrid.classList.remove('hidden');
        elements.productsList.classList.add('hidden');
    } else {
        renderProductsList();
        elements.productsGrid.classList.add('hidden');
        elements.productsList.classList.remove('hidden');
    }
}

function renderProductsGrid() {
    elements.productsGrid.innerHTML = currentProducts.map(product => `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            ${product.images && product.images.length > 0 ? `
                <div class="aspect-w-16 aspect-h-9 bg-gray-100">
                    <img src="${product.images[0]}" alt="${product.name}" class="w-full h-48 object-cover">
                </div>
            ` : `
                <div class="h-48 bg-gradient-to-br from-stripe-purple to-stripe-purple-dark flex items-center justify-center">
                    <i class="fas fa-box text-white text-3xl opacity-50"></i>
                </div>
            `}
            
            <div class="p-4">
                <div class="flex items-start justify-between mb-2">
                    <h3 class="font-medium text-gray-900 truncate pr-2">${product.name}</h3>
                    <span class="flex-shrink-0 px-2 py-1 text-xs rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                        ${product.active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                
                ${product.description ? `
                    <p class="text-sm text-gray-600 mb-3 line-clamp-2">${product.description}</p>
                ` : ''}
                
                <div class="space-y-2">
                    ${product.default_price && product.default_price.unit_amount ? `
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-500">Price:</span>
                            <span class="font-medium text-stripe-purple">
                                ${formatPrice(product.default_price.unit_amount, product.default_price.currency)}
                            </span>
                        </div>
                    ` : ''}
                    
                    <div class="flex items-center justify-between text-xs text-gray-400">
                        <span>ID: ${product.id}</span>
                        <span>${formatDate(product.created)}</span>
                    </div>
                </div>
                
                ${product.url ? `
                    <div class="mt-3 pt-3 border-t border-gray-100">
                        <a href="${product.url}" target="_blank" class="text-sm text-stripe-purple hover:text-stripe-purple-dark flex items-center">
                            <i class="fas fa-external-link-alt mr-1"></i>
                            View Product
                        </a>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function renderProductsList() {
    elements.productsList.innerHTML = currentProducts.map(product => `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start space-x-4">
                ${product.images && product.images.length > 0 ? `
                    <div class="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img src="${product.images[0]}" alt="${product.name}" class="w-full h-full object-cover">
                    </div>
                ` : `
                    <div class="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-stripe-purple to-stripe-purple-dark rounded-lg flex items-center justify-center">
                        <i class="fas fa-box text-white opacity-50"></i>
                    </div>
                `}
                
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between mb-1">
                        <h3 class="font-medium text-gray-900 truncate pr-4">${product.name}</h3>
                        <span class="flex-shrink-0 px-2 py-1 text-xs rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                            ${product.active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    
                    ${product.description ? `
                        <p class="text-sm text-gray-600 mb-2 line-clamp-1">${product.description}</p>
                    ` : ''}
                    
                    <div class="flex items-center justify-between text-sm">
                        <div class="flex items-center space-x-4">
                            ${product.default_price && product.default_price.unit_amount ? `
                                <span class="font-medium text-stripe-purple">
                                    ${formatPrice(product.default_price.unit_amount, product.default_price.currency)}
                                </span>
                            ` : ''}
                            <span class="text-gray-400">ID: ${product.id}</span>
                            <span class="text-gray-400">${formatDate(product.created)}</span>
                        </div>
                        
                        ${product.url ? `
                            <a href="${product.url}" target="_blank" class="text-stripe-purple hover:text-stripe-purple-dark flex items-center">
                                <i class="fas fa-external-link-alt mr-1"></i>
                                View
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleViewMode() {
    currentView = currentView === 'grid' ? 'list' : 'grid';
    elements.viewIcon.className = currentView === 'grid' ? 'fas fa-list' : 'fas fa-th-large';
    
    if (currentProducts.length > 0) {
        renderProducts();
    }
}

function handleSort() {
    currentSort = elements.sortSelect.value;
    if (currentProducts.length > 0) {
        sortProducts(currentSort);
        renderProducts();
    }
}

function sortProducts(sortBy) {
    currentProducts.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'created':
                return b.created - a.created; // Newest first
            case 'updated':
                return b.updated - a.updated; // Most recently updated first
            case 'price':
                const priceA = a.default_price?.unit_amount || 0;
                const priceB = b.default_price?.unit_amount || 0;
                return priceB - priceA; // Highest price first
            default:
                return 0;
        }
    });
}

function updateProductCount(count) {
    if (count === 0) {
        elements.productCount.textContent = 'No products loaded';
    } else {
        elements.productCount.textContent = `${count} product${count === 1 ? '' : 's'} loaded`;
    }
}

function resetToSearch() {
    elements.urlInput.value = '';
    currentProducts = [];
    showSection('');
    updateProductCount(0);
    elements.urlInput.focus();
}

// Utility functions
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function formatPrice(amount, currency) {
    if (amount === null || amount === undefined) {
        return 'N/A';
    }
    
    const price = amount / 100; // Convert from cents
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(price);
}

function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Add some CSS for line-clamp (since Tailwind CDN might not include it)
const style = document.createElement('style');
style.textContent = `
    .line-clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style);