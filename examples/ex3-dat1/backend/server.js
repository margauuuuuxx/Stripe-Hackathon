/**
 * Simple Express server for dat1 Chat
 * 
 * Provides streaming chat API with dat1 gpt-oss-120b model integration
 */

// Load environment variables from .env file if available
try {
    require('dotenv').config();
    console.log('[Config] dotenv loaded');
} catch (e) {
    console.warn('[Config] dotenv not available:', e.message);
}

// Log environment variable status (without exposing values)
console.log('[Config] Environment check:', {
    hasDat1Key: !!process.env.DAT1_API_KEY,
    dat1KeyLength: process.env.DAT1_API_KEY ? process.env.DAT1_API_KEY.length : 0,
});

const path = require('path');
const express = require('express');
const cors = require('cors');

// ============================================================================
// CONSTANTS
// ============================================================================

const DAT1_API_URL = 'https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 5000;
const PORT = process.env.PORT || 3000;

// ============================================================================
// SERVER SETUP
// ============================================================================

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parses SSE chunk and extracts JSON data
 */
function parseSSEChunk(chunk) {
    const lines = chunk.split('\n');
    
    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
                return null;
            }

            try {
                return JSON.parse(data);
            } catch (e) {
                continue;
            }
        }
    }

    return null;
}

/**
 * Makes a streaming request to dat1 API
 */
async function makeDat1Request(messages, temperature, maxTokens) {
    console.log('[dat1] Making request:', {
        messageCount: messages.length,
        temperature,
        maxTokens
    });
    
    if (!process.env.DAT1_API_KEY) {
        console.error('[dat1] ERROR: DAT1_API_KEY is not configured');
        throw new Error('DAT1_API_KEY is not configured');
    }

    const apiUrl = process.env.DAT1_CHAT_ENDPOINT_OVERRIDE || DAT1_API_URL;

    const requestBody = {
        messages,
        temperature,
        stream: true,
        max_tokens: maxTokens,
    };

    const startTime = Date.now();
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.DAT1_API_KEY,
            },
            body: JSON.stringify(requestBody),
        });
        const elapsed = Date.now() - startTime;
        console.log(`[dat1] Request completed (${elapsed}ms):`, response.status);
        return response;
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`[dat1] Request failed (${elapsed}ms):`, error.message);
        throw error;
    }
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * POST /api/chat-stream
 * Streaming chat endpoint
 */
app.post('/api/chat-stream', async (req, res) => {
    const requestStartTime = Date.now();
    const { messages } = req.body;
    console.log(`[API] POST /api/chat-stream - ${messages.length} messages`);

    if (!process.env.DAT1_API_KEY) {
        console.error('[API] ERROR: DAT1_API_KEY is not configured');
        return res.status(500).json({ error: 'DAT1_API_KEY is not configured' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const temperature = req.body.temperature || DEFAULT_TEMPERATURE;
    const maxTokens = req.body.max_tokens || DEFAULT_MAX_TOKENS;

    try {
        // Make request to dat1 API
        console.log(`[API] Making request to dat1 API with ${messages.length} messages`);
        const dat1StartTime = Date.now();
        const response = await makeDat1Request(messages, temperature, maxTokens);
        const dat1Elapsed = Date.now() - dat1StartTime;
        console.log(`[API] dat1 API response received (${dat1Elapsed}ms):`, response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            res.write(`data: ${JSON.stringify({ error: `dat1 API error: ${errorText}` })}\n\n`);
            res.end();
            return;
        }

        // Process streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            res.write(`data: ${JSON.stringify({ error: 'Response body is not readable' })}\n\n`);
            res.end();
            return;
        }

        let finalData = null;

        // Read streaming chunks
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const parsed = parseSSEChunk(chunk);

            if (!parsed) {
                // Forward [DONE] marker
                if (chunk.includes('[DONE]')) {
                    res.write('data: [DONE]\n\n');
                }
                continue;
            }

            // Forward content chunks
            res.write(chunk + '\n');

            // Capture final data
            if (parsed.usage || parsed.timings) {
                finalData = parsed;
            }
        }

        // Send final data and close
        const totalElapsed = Date.now() - requestStartTime;
        console.log(`[API] Request completed successfully (${totalElapsed}ms)`);
        if (finalData) {
            res.write(`data: ${JSON.stringify(finalData)}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        const totalElapsed = Date.now() - requestStartTime;
        console.error(`[API] Error in chat-stream (${totalElapsed}ms):`, error);
        console.error('[API] Error stack:', error.stack);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

/**
 * GET /api/endpoint
 * Returns the current endpoint URL for display in UI
 */
app.get('/api/endpoint', (req, res) => {
    const apiUrl = process.env.DAT1_CHAT_ENDPOINT_OVERRIDE || DAT1_API_URL;
    res.json({ endpoint: apiUrl });
});

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Make sure DAT1_API_KEY is set in your environment`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use.`);
        console.error(`\nTo fix this, you can:`);
        console.error(`1. Stop the process using port ${PORT}:`);
        console.error(`   lsof -ti:${PORT} | xargs kill -9`);
        console.error(`2. Or use a different port by setting PORT in your .env file`);
        console.error(`   Example: PORT=3001\n`);
        process.exit(1);
    } else {
        console.error('Server error:', error);
        process.exit(1);
    }
});

