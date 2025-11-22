// Configuration
const API_BASE_URL = 'http://localhost:3000';

// State management
const state = {
    messages: [],
    currentProduct: null,
    currentFrequency: null,
    currentFlow: 'input', // 'input', 'confirming', 'frequency', 'overview'
    selectedProducts: [], // Multiple products for subscription
    subscriptions: [] // All user subscriptions
};

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const productModal = document.getElementById('productModal');
const frequencyModal = document.getElementById('frequencyModal');
const overviewModal = document.getElementById('overviewModal');

// Event Listeners
sendButton.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Modal event listeners
document.getElementById('confirmYes').addEventListener('click', () => handleProductConfirmation(true));
document.getElementById('confirmNo').addEventListener('click', () => handleProductConfirmation(false));
document.querySelectorAll('.frequency-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleFrequencySelection(e.target.dataset.frequency));
});
document.getElementById('addAnotherProduct').addEventListener('click', handleAddAnotherProduct);
document.getElementById('confirmSubscription').addEventListener('click', handleSubscriptionConfirmation);
document.getElementById('cancelSubscription').addEventListener('click', handleSubscriptionCancel);

// Sidebar event listeners
document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
document.getElementById('openSidebar').addEventListener('click', openSidebar);

// Initialize chat
window.addEventListener('load', () => {
    addBotMessage("👋 Welcome to Agentic Product Subscription!\n\n🛍️ I'll help you set up automatic product purchases.\n\nSimply enter a product name (e.g., 'hydrating cream from typology') and I'll find it for you!");
});

// Message handling
function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addUserMessage(message);
    userInput.value = '';
    sendButton.disabled = true;

    // Show typing indicator
    const typingId = showTypingIndicator();

    // Search for product
    searchProduct(message, typingId);
}

// Product search and workflow
async function searchProduct(query, typingId) {
    try {
        addBotMessage(`🔍 Searching for "${query}"...`);
        
        const response = await fetch(`${API_BASE_URL}/api/search-product`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        removeTypingIndicator(typingId);
        
        if (data.error) {
            addBotMessage(`❌ Error: ${data.error}`);
            sendButton.disabled = false;
            return;
        }

        // Store product data
        state.currentProduct = data.product;
        state.currentFlow = 'confirming';
        
        // Show confirmation modal
        showProductConfirmation(data.product);
        
    } catch (error) {
        console.error('Search error:', error);
        removeTypingIndicator(typingId);
        addBotMessage("❌ Sorry, I'm having trouble searching for products. Make sure the backend is running.");
        sendButton.disabled = false;
    }
}

function showProductConfirmation(product) {
    const detailsDiv = document.getElementById('productDetails');
    const retailerInfo = product.retailer || 'Online Store';
    const productUrl = product.productUrl || '#';
    
    detailsDiv.innerHTML = `
        <div class="product-card">
            <img src="${product.image || 'https://via.placeholder.com/400x400/667eea/ffffff?text=Product'}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.src='https://via.placeholder.com/400x400/667eea/ffffff?text=Product'">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-brand">${product.brand || 'Unknown Brand'}</p>
                <p class="product-description">${product.description || 'No description available'}</p>
                <p class="product-price">$${product.price ? product.price.toFixed(2) : '0.00'}</p>
                <div class="product-source">
                    <p class="retailer-info">
                        📦 Will be purchased from: <strong>${retailerInfo}</strong>
                    </p>
                    ${productUrl !== '#' ? `<a href="${productUrl}" target="_blank" class="product-link">View Product Page →</a>` : ''}
                </div>
            </div>
        </div>
    `;
    productModal.style.display = 'flex';
}

function handleProductConfirmation(confirmed) {
    productModal.style.display = 'none';
    
    if (confirmed) {
        // Add to selected products
        state.selectedProducts.push(state.currentProduct);
        addBotMessage(`✅ Great! You selected: **${state.currentProduct.name}**\n\nNow let's set up the purchase frequency.`);
        state.currentFlow = 'frequency';
        frequencyModal.style.display = 'flex';
    } else {
        addBotMessage("❌ No problem! Please enter a different product name to search again.");
        state.currentProduct = null;
        state.currentFlow = 'input';
        sendButton.disabled = false;
    }
}

function handleFrequencySelection(frequency) {
    frequencyModal.style.display = 'none';
    state.currentFrequency = frequency;
    state.currentFlow = 'overview';
    
    const frequencyText = {
        'weekly': 'once a week',
        'biweekly': 'every 2 weeks',
        'monthly': 'once a month',
        'quarterly': 'once a quarter'
    }[frequency];
    
    addBotMessage(`📅 Frequency set to: **${frequencyText}**\n\nLet me show you the subscription overview...`);
    
    // Show overview
    showSubscriptionOverview();
}

function showSubscriptionOverview() {
    const frequencyText = {
        'weekly': 'Every Week',
        'biweekly': 'Every 2 Weeks',
        'monthly': 'Every Month',
        'quarterly': 'Every Quarter'
    }[state.currentFrequency];
    
    const daysMap = {
        'weekly': 7,
        'biweekly': 14,
        'monthly': 30,
        'quarterly': 90
    };
    
    const nextDates = calculateNextDates(daysMap[state.currentFrequency], 3);
    
    // Calculate total price for all selected products
    const totalPrice = state.selectedProducts.reduce((sum, p) => sum + (p.price || 0), 0);
    
    const detailsDiv = document.getElementById('overviewDetails');
    
    // Build products HTML
    const productsHTML = state.selectedProducts.map(product => `
        <div class="overview-product">
            <img src="${product.image || 'https://via.placeholder.com/150'}" 
                 alt="${product.name}" 
                 class="overview-image"
                 onerror="this.src='https://via.placeholder.com/150x150/667eea/ffffff?text=Product'">
            <div class="overview-product-info">
                <h3>${product.name}</h3>
                <p class="brand">${product.brand || 'Unknown Brand'}</p>
                <p class="retailer">From: ${product.retailer || 'Online Store'}</p>
                <p class="price">$${product.price ? product.price.toFixed(2) : '0.00'}</p>
            </div>
        </div>
    `).join('');
    
    detailsDiv.innerHTML = `
        <div class="overview-card">
            <h3 class="overview-section-title">📦 Products (${state.selectedProducts.length})</h3>
            <div class="overview-products-list">
                ${productsHTML}
            </div>
            
            <div class="overview-details-section">
                <div class="overview-row">
                    <span class="label">Frequency:</span>
                    <span class="value">${frequencyText}</span>
                </div>
                <div class="overview-row">
                    <span class="label">Total per order:</span>
                    <span class="value total-price">$${totalPrice.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="schedule-section">
                <h4>📅 Upcoming Orders:</h4>
                <ul class="schedule-list">
                    ${nextDates.map((date, i) => `<li>Order ${i + 1}: ${date} - $${totalPrice.toFixed(2)}</li>`).join('')}
                </ul>
            </div>
            
            <p class="overview-note">⚡ Your payment will be automatically processed on these dates using Stripe's agentic payment system.</p>
        </div>
    `;
    
    overviewModal.style.display = 'flex';
}

function calculateNextDates(intervalDays, count) {
    const dates = [];
    const now = new Date();
    
    for (let i = 1; i <= count; i++) {
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + (intervalDays * i));
        dates.push(nextDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        }));
    }
    
    return dates;
}

function handleAddAnotherProduct() {
    overviewModal.style.display = 'none';
    addBotMessage(`✅ Current products added! Search for another product to add to this subscription.`);
    
    // Keep the frequency and selected products, reset product search
    state.currentProduct = null;
    state.currentFlow = 'input';
    sendButton.disabled = false;
    userInput.focus();
}

async function handleSubscriptionConfirmation() {
    overviewModal.style.display = 'none';
    
    const typingId = showTypingIndicator();
    
    try {
        const totalPrice = state.selectedProducts.reduce((sum, p) => sum + (p.price || 0), 0);
        
        const response = await fetch(`${API_BASE_URL}/api/create-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: state.selectedProducts,
                frequency: state.currentFrequency
            })
        });
        
        const data = await response.json();
        removeTypingIndicator(typingId);
        
        if (data.success) {
            // Add to subscriptions list
            const subscription = {
                id: data.subscriptionId,
                products: state.selectedProducts,
                frequency: state.currentFrequency,
                totalPrice: totalPrice,
                nextCharge: data.nextCharge,
                createdAt: new Date().toISOString()
            };
            state.subscriptions.push(subscription);
            
            // Save to localStorage
            saveSubscriptions();
            
            // Update dashboard
            renderSubscriptions();
            
            const productNames = state.selectedProducts.map(p => p.name).join(', ');
            addBotMessage(`🎉 **Subscription Created Successfully!**\n\n✅ Your agentic payment has been set up!\n\n📋 Subscription Details:\n• ID: ${data.subscriptionId}\n• Products: ${productNames}\n• Frequency: ${state.currentFrequency}\n• Total per order: $${totalPrice.toFixed(2)}\n• Next charge: ${data.nextCharge}\n\nYour products will be automatically ordered and charged according to your schedule!`);
        } else {
            addBotMessage(`❌ Failed to create subscription: ${data.error}`);
        }
        
    } catch (error) {
        removeTypingIndicator(typingId);
        addBotMessage("❌ Error creating subscription. Please try again.");
    }
    
    // Reset state
    state.currentProduct = null;
    state.currentFrequency = null;
    state.selectedProducts = [];
    state.currentFlow = 'input';
    sendButton.disabled = false;
}

function handleSubscriptionCancel() {
    overviewModal.style.display = 'none';
    addBotMessage("❌ Subscription cancelled. Feel free to search for another product!");
    
    state.currentProduct = null;
    state.currentFrequency = null;
    state.selectedProducts = [];
    state.currentFlow = 'input';
    sendButton.disabled = false;
}

// Sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('collapsed');
}

// Subscription management
function saveSubscriptions() {
    localStorage.setItem('subscriptions', JSON.stringify(state.subscriptions));
}

function loadSubscriptions() {
    const saved = localStorage.getItem('subscriptions');
    if (saved) {
        state.subscriptions = JSON.parse(saved);
        renderSubscriptions();
    }
}

function renderSubscriptions() {
    const listDiv = document.getElementById('subscriptionsList');
    
    if (state.subscriptions.length === 0) {
        listDiv.innerHTML = '<p class="empty-state">No subscriptions yet. Create your first one!</p>';
        return;
    }
    
    const frequencyLabels = {
        'weekly': 'Weekly',
        'biweekly': 'Bi-weekly',
        'monthly': 'Monthly',
        'quarterly': 'Quarterly'
    };
    
    const html = state.subscriptions.map(sub => {
        const productCount = sub.products.length;
        const firstProduct = sub.products[0];
        const moreText = productCount > 1 ? ` +${productCount - 1} more` : '';
        
        return `
            <div class="subscription-item">
                <div class="subscription-header">
                    <span class="subscription-id">#${sub.id.substring(0, 8)}</span>
                    <button class="delete-btn" onclick="deleteSubscription('${sub.id}')">✕</button>
                </div>
                <div class="subscription-body">
                    <div class="subscription-product">
                        <img src="${firstProduct.image}" alt="${firstProduct.name}" onerror="this.src='https://via.placeholder.com/50x50/667eea/ffffff?text=P'">
                        <div>
                            <p class="product-name">${firstProduct.name}${moreText}</p>
                            <p class="product-brand">${firstProduct.brand}</p>
                        </div>
                    </div>
                    <div class="subscription-details">
                        <div class="detail-row">
                            <span class="icon">💰</span>
                            <span>$${sub.totalPrice.toFixed(2)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="icon">📅</span>
                            <span>${frequencyLabels[sub.frequency]}</span>
                        </div>
                        <div class="detail-row">
                            <span class="icon">⏰</span>
                            <span>Next: ${sub.nextCharge}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    listDiv.innerHTML = html;
}

function deleteSubscription(subscriptionId) {
    if (confirm('Are you sure you want to cancel this subscription?')) {
        state.subscriptions = state.subscriptions.filter(sub => sub.id !== subscriptionId);
        saveSubscriptions();
        renderSubscriptions();
        addBotMessage(`✅ Subscription #${subscriptionId.substring(0, 8)} has been cancelled.`);
    }
}

// Load subscriptions on page load
window.addEventListener('load', () => {
    loadSubscriptions();
});



// UI Helper Functions
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-user';
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addBotMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-bot';
    
    // Parse markdown if marked library is available
    let content;
    if (typeof marked !== 'undefined') {
        content = marked.parse(text);
    } else {
        // Fallback: escape HTML and convert newlines to <br>
        content = escapeHtml(text).replace(/\n/g, '<br>');
    }
    
    messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function createAssistantMessage(id) {
    const messageDiv = document.createElement('div');
    messageDiv.id = id;
    messageDiv.className = 'message message-bot';
    messageDiv.innerHTML = '<div class="message-content"></div>';
    return messageDiv;
}

function updateAssistantMessage(id, content) {
    const messageDiv = document.getElementById(id);
    if (!messageDiv) return;

    // Parse markdown if marked library is available
    let formattedContent;
    if (typeof marked !== 'undefined') {
        formattedContent = marked.parse(content);
    } else {
        // Fallback: escape HTML and convert newlines to <br>
        formattedContent = escapeHtml(content).replace(/\n/g, '<br>');
    }

    const contentDiv = messageDiv.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.innerHTML = formattedContent;
    }
    scrollToBottom();
}

function updateAssistantMessageMeta(id, metaInfo) {
    const messageDiv = document.getElementById(id);
    if (!messageDiv) return;

    let metaDiv = messageDiv.querySelector('.message-meta');
    if (!metaDiv) {
        metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        messageDiv.appendChild(metaDiv);
    }
    metaDiv.textContent = metaInfo;
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'message message-bot';
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

