# Stripe Agentic Payments Hackathon - Dat1 Demo

A simple chat interface demonstrating integration with the dat1 predeployed gpt-oss-120b model. The AI agent can have natural language conversations with real-time streaming responses.


<div style="color: #0066cc; background-color: #e6f2ff; border-left: 4px solid #0066cc; padding: 12px; margin: 16px 0; border-radius: 4px;">

**Important Notes:** 
- See [https://notion.so/dface/Dat1-co-for-Agentic-Payments-Hackathon-2aae4b7b4962806d91bbfe0d7ff52db6](https://notion.so/dface/Dat1-co-for-Agentic-Payments-Hackathon-2aae4b7b4962806d91bbfe0d7ff52db6) for a getting started guide, provided by Dat1 for this hackathon.
- See `.docs` for LLM friendly markdown API docs
</div>


## Environment Variables

### Backend
Create [backend/.env](backend/.env):
```bash
DAT1_API_KEY="..."                   # DAT1 API key for LLM
PORT=3000                            # Port for backend server (optional, defaults to 3000)
DAT1_CHAT_ENDPOINT_OVERRIDE="..."    # Optional: override default endpoint URL
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
stripe-agentic-payments-hackathon-dat1-demo/
├── frontend/
│   ├── index.html          # Simple HTML frontend
│   ├── app.js              # Vanilla JavaScript chat interface
│   └── styles.css          # Simple CSS styles
├── backend/
│   ├── server.js           # Express backend with streaming API
│   └── package.json
├── dat1-deploy-custom-models/
│   ├── llama-chat/         # LLaMA 3.2 3B chat model deployment example
│   └── bge-reranker/       # BGE reranker model deployment example
└── README.md
```

## What It Does

- Simple chat interface with real-time streaming responses
- Integrates with dat1 gpt-oss-120b model for AI conversations
- Shows performance metrics including prompt time, generation speed, and token count
- No build step required - just run the server and open the HTML file

## How It Works

1. User sends a message through the chat interface
2. Frontend sends request to `/api/chat-stream` endpoint
3. Backend streams the response from dat1 API to the frontend
4. Frontend displays the streaming response in real-time
5. Performance metrics are displayed after the response completes

## Model

This app uses the dat1 predeployed gpt-oss-120b model at:
`https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat`

You can override this endpoint by setting `DAT1_CHAT_ENDPOINT_OVERRIDE` in your `.env` file.

## Deploying Custom Models

This repository includes examples for deploying custom models to dat1 in the `dat1-deploy-custom-models/` folder:

### Available Examples

1. **LLaMA Chat** (`dat1-deploy-custom-models/llama-chat/`)
   - Deploy a LLaMA 3.2 3B chat model with OpenAI-compatible API
   - Supports streaming and non-streaming responses
   - See the [README](dat1-deploy-custom-models/llama-chat/README.md) for setup instructions

2. **BGE Reranker** (`dat1-deploy-custom-models/bge-reranker/`)
   - Deploy a multilingual reranker model for evaluating query-passage relevance
   - Supports 100+ languages
   - See the [README](dat1-deploy-custom-models/bge-reranker/README.md) for setup instructions

### Using a Custom Deployed Model

After deploying a custom model, you can use it in this chat app by:

1. Deploy your model using the dat1 CLI:
   ```bash
   cd dat1-deploy-custom-models/llama-chat  # or bge-reranker
   dat1 deploy
   ```

2. Copy the endpoint URL provided by the CLI

3. Add it to your `backend/.env` file:
   ```bash
   DAT1_CHAT_ENDPOINT_OVERRIDE="https://api.dat1.co/api/v1/inference/your-model-name/invoke-stream"
   ```

4. Restart the backend server

The chat interface will now use your custom deployed model instead of the default gpt-oss-120b model.

## Example Queries

- "Hello, how are you?"
- "Explain quantum computing in simple terms"
- "Write a Python function to calculate fibonacci numbers"
- "What are the benefits of using TypeScript?"

