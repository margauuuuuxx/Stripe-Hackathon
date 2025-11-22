# Agentic Product Subscription

An AI-powered subscription management system that helps users set up automatic product purchases using natural language. Built with Stripe MCP (Model Context Protocol) integration and streaming chat capabilities.

## 🌟 Features

- **Natural Language Product Search**: Search for products using conversational queries
- **AI-Powered Recommendations**: Get intelligent product suggestions based on your needs
- **Automated Subscription Setup**: Configure recurring purchases with flexible frequencies
- **Real-time Chat Interface**: Stream responses with Stripe MCP tool integration
- **Stripe Integration**: Search and manage real Stripe products and subscriptions

### Possible Future Features
  
- Calendar integration to anticipate gift purchases (birthdays, Christmas, trips, etc.) + verification of which third-party sites Stripe can access.
- Automatic purchasing when a product’s price drops below a defined threshold.
- Chatbot assistance providing information about when and how an order will be delivered.
- Automatic delivery scheduling or rescheduling based on the user’s calendar.
- Automatic fetching of promo codes or offers for products the user already buys (feature can be enabled or disabled).
- Smart recommendations based on user activity on social networks.
- Shared shopping cart across multiple Stripe-compatible sellers.

## 🏗️ Architecture

The application consists of two main components:

### Frontend
- **Simple HTML/CSS/JavaScript** interface
- Real-time streaming chat with markdown support
- Modal-based workflow for product confirmation and subscription setup
- Located in `app/frontend/`

### Backend
- **Express.js** server with streaming API support
- **Stripe MCP Integration** for accessing Stripe tools and data
- **DAT1 AI Service** for natural language processing and recommendations
- **Modular architecture** with separate services:
  - `ai-service.js` - Handles AI-powered query analysis and recommendations
  - `stripe-service.js` - Manages Stripe API interactions
  - `mcp/` - Stripe MCP tool integration and caching
- Located in `app/backend/`

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Stripe Account** with API access
- **DAT1 API Key** for AI capabilities

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd stripe-hackathon
```

### 2. Install Dependencies

```bash
cd app/backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `app/backend/` directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DAT1_API_KEY=your_dat1_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
```

### 4. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 5. Open the Application

Navigate to `http://localhost:3000` in your web browser.

## 🎯 How to Use

1. **Enter a Product Query**: Type a product name or description (e.g., "hydrating cream from typology")
2. **Confirm Product**: Review the AI-selected product and confirm it's correct
3. **Set Frequency**: Choose how often you want the product delivered:
   - Once a Week
   - Every 2 Weeks
   - Once a Month
   - Once a Quarter
4. **Review & Confirm**: Review the subscription details and confirm

## 🔧 API Endpoints

### POST `/api/search-product`
Search for products using AI analysis and Stripe API.

**Request:**
```json
{
  "query": "hydrating cream"
}
```

**Response:**
```json
{
  "product": { /* product details */ },
  "allProducts": [ /* all matching products */ ],
  "totalFound": 5,
  "recommendation": "AI recommendation text",
  "analysis": { /* AI analysis */ },
  "query": "hydrating cream"
}
```

### POST `/api/create-subscription`
Create a Stripe subscription for recurring purchases.

**Request:**
```json
{
  "product": { /* product object */ },
  "frequency": "monthly",
  "customerEmail": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "sub_xxx",
  "nextCharge": "Dec 22, 2025",
  "amount": 29.99,
  "interval": "month"
}
```

### POST `/api/chat-stream`
Streaming chat endpoint with Stripe MCP tool support.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Show me my recent invoices" }
  ],
  "temperature": 0.7,
  "max_tokens": 5000
}
```

**Response:** Server-Sent Events (SSE) stream with chat messages and tool execution results.

## 🛠️ Development

### Project Structure

```
stripe-hackathon/
├── app/
│   ├── backend/
│   │   ├── lib/
│   │   │   ├── ai-service.js       # AI query analysis & recommendations
│   │   │   ├── stripe-service.js   # Stripe API interactions
│   │   │   └── mcp/
│   │   │       ├── tools.js        # MCP tool definitions & caching
│   │   │       └── stripe-mcp.js   # MCP tool execution
│   │   ├── server.js               # Express server & API routes
│   │   ├── package.json
│   │   ├── .env.example
│   │   └── .env
│   └── frontend/
│       ├── index.html              # Main application UI
│       ├── app.js                  # Frontend logic & API calls
│       └── styles.css              # Application styles
└── README.md
```

### Key Technologies

- **Express.js**: Web server framework
- **Stripe SDK**: Product and subscription management
- **DAT1 API**: AI-powered natural language processing
- **Stripe MCP**: Model Context Protocol for tool integration
- **Server-Sent Events (SSE)**: Real-time streaming responses
