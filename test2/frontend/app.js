// Configuration
const API_BASE_URL = 'http://localhost:3000';

// State management
const state = {
    messages: [],
    currentProduct: null,
    currentFrequency: null,
    currentFlow: 'input' // 'input', 'confirming', 'frequency', 'overview'
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
document.getElementById('confirmSubscription').addEventListener('click', handleSubscriptionConfirmation);
document.getElementById('cancelSubscription').addEventListener('click', handleSubscriptionCancel);

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
    detailsDiv.innerHTML = `
        <div class="product-card">
            <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-brand">${product.brand || 'Unknown Brand'}</p>
                <p class="product-description">${product.description || 'No description available'}</p>
                <p class="product-price">$${product.price ? product.price.toFixed(2) : '0.00'}</p>
            </div>
        </div>
    `;
    productModal.style.display = 'flex';
}

function handleProductConfirmation(confirmed) {
    productModal.style.display = 'none';
    
    if (confirmed) {
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
    
    const detailsDiv = document.getElementById('overviewDetails');
    detailsDiv.innerHTML = `
        <div class="overview-card">
            <div class="overview-product">
                <img src="${state.currentProduct.image || 'https://via.placeholder.com/150'}" alt="${state.currentProduct.name}" class="overview-image">
                <div>
                    <h3>${state.currentProduct.name}</h3>
                    <p>${state.currentProduct.brand || 'Unknown Brand'}</p>
                </div>
            </div>
            
            <div class="overview-details-section">
                <div class="overview-row">
                    <span class="label">Frequency:</span>
                    <span class="value">${frequencyText}</span>
                </div>
                <div class="overview-row">
                    <span class="label">Price per order:</span>
                    <span class="value">$${state.currentProduct.price ? state.currentProduct.price.toFixed(2) : '0.00'}</span>
                </div>
            </div>
            
            <div class="schedule-section">
                <h4>📅 Upcoming Orders:</h4>
                <ul class="schedule-list">
                    ${nextDates.map((date, i) => `<li>Order ${i + 1}: ${date}</li>`).join('')}
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

async function handleSubscriptionConfirmation() {
    overviewModal.style.display = 'none';
    
    const typingId = showTypingIndicator();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product: state.currentProduct,
                frequency: state.currentFrequency
            })
        });
        
        const data = await response.json();
        removeTypingIndicator(typingId);
        
        if (data.success) {
            addBotMessage(`🎉 **Subscription Created Successfully!**\n\n✅ Your agentic payment has been set up for **${state.currentProduct.name}**\n\n📋 Subscription Details:\n• ID: ${data.subscriptionId}\n• Frequency: ${state.currentFrequency}\n• Next charge: ${data.nextCharge}\n\nYour product will be automatically ordered and charged according to your schedule!`);
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
    state.currentFlow = 'input';
    sendButton.disabled = false;
}

function handleSubscriptionCancel() {
    overviewModal.style.display = 'none';
    addBotMessage("❌ Subscription cancelled. Feel free to search for another product!");
    
    state.currentProduct = null;
    state.currentFrequency = null;
    state.currentFlow = 'input';
    sendButton.disabled = false;
}



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

