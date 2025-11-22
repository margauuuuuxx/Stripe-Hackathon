# Stripe Agentic Payments Hackathon - MCP Demo

A simple chat interface demonstrating integration with the dat1 predeployed gpt-oss-120b model and Stripe MCP (Model Context Protocol) server. The AI agent can execute Stripe operations like retrieving balance, creating customers, managing products, and more through natural language conversations.


<div style="color: #0066cc; background-color: #e6f2ff; border-left: 4px solid #0066cc; padding: 12px; margin: 16px 0; border-radius: 4px;">

**Important Notes:** 
- find a getting started guide at `.docs/stripe_getting_started.pdf`
- find LLM-friendly API docs at `.docs`
</div>

## Example

![Chat Example](.docs/chat_example.jpg)

## Environment Variables

### Backend
Create [backend/.env](backend/.env):
```bash
STRIPE_SECRET_KEY="sk_test_..."      # Stripe secret key
DAT1_API_KEY="..."                   # DAT1 API key for LLM
PORT=3000                            # Port for backend server (optional, defaults to 3000)
```

## Quick Start

### Start All Services at Once

**Using VS Code/Cursor Tasks**
1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Tasks: Run Task"
3. Select "Start All Services"
4. This will start both the backend and frontend servers in separate dedicated terminal tabs

---

### Manual Start

### 1. Backend
```bash
cd backend
npm install
npm start
```

### 2. Frontend
```bash
cd frontend
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser

## Project Structure

```
stripe-agentic-payments-hackathon-mcp-demo/
├── frontend/
│   ├── index.html          # Simple HTML frontend
│   ├── app.js              # Vanilla JavaScript chat interface
│   └── styles.css          # Simple CSS styles
├── backend/
│   ├── server.js           # Express backend with streaming API
│   ├── package.json
│   └── lib/
│       └── mcp/
│           ├── stripe-mcp.js  # Stripe MCP HTTP client
│           └── tools.js        # Tool definitions and conversion
└── README.md
```

## What It Does

- Simple chat interface with real-time streaming responses
- Integrates with Stripe MCP to execute Stripe operations
- Shows performance metrics including prompt time, generation speed, and token count
- No build step required - just run the server and open the HTML file

## How It Works

1. User sends a message through the chat interface
2. Frontend sends request to `/api/chat-stream` endpoint
3. Backend fetches available Stripe MCP tools and includes them in the request
4. Backend streams the response from dat1 API to the frontend
5. If the AI requests a Stripe tool, the backend executes it via MCP
6. Tool results are sent back to the AI for final response
7. Frontend displays the streaming response in real-time

## Model

This app uses the dat1 predeployed gpt-oss-120b model at:
`https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat`

## Example Queries

- "Check my Stripe balance"
- "Create a customer named John Doe with email john@example.com"
- "List my products"
- "What's my account status?"

