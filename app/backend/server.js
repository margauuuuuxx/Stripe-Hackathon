/**
 * Simple Express server for Stripe MCP Chat
 * 
 * Provides streaming chat API with Stripe MCP tool integration
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
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    dat1KeyLength: process.env.DAT1_API_KEY ? process.env.DAT1_API_KEY.length : 0,
    stripeKeyLength: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.length : 0,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) : 'missing'
});

const path = require('path');
const express = require('express');
const cors = require('cors');
const { getStripeTools } = require('./lib/mcp/tools');
const { callStripeMCPTool } = require('./lib/mcp/stripe-mcp');
const { StripeService } = require('./lib/stripe-service');
const { AIService } = require('./lib/ai-service');

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
// SERVICES INITIALIZATION
// ============================================================================

let stripeService = null;
let aiService = null;

// Initialize services if environment variables are available
if (process.env.STRIPE_SECRET_KEY) {
    try {
        stripeService = new StripeService(process.env.STRIPE_SECRET_KEY);
        console.log('[Services] Stripe service initialized');
    } catch (error) {
        console.error('[Services] Failed to initialize Stripe service:', error.message);
    }
}

if (process.env.DAT1_API_KEY) {
    try {
        aiService = new AIService(process.env.DAT1_API_KEY);
        console.log('[Services] AI service initialized');
    } catch (error) {
        console.error('[Services] Failed to initialize AI service:', error.message);
    }
}

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
 * Executes a tool call via Stripe MCP
 */
async function executeToolCall(toolName, toolArguments) {
    console.log(`[ToolCall] Executing ${toolName}`, {
        argumentsLength: toolArguments ? toolArguments.length : 0
    });
    const startTime = Date.now();
    try {
        let parsedArgs = {};
        
        if (toolArguments) {
            try {
                parsedArgs = JSON.parse(toolArguments);
                console.log(`[ToolCall] Parsed arguments for ${toolName}`);
            } catch (parseError) {
                console.error(`[ToolCall] Failed to parse arguments for ${toolName}:`, parseError.message);
                throw new Error(`Invalid tool arguments JSON: ${parseError.message}`);
            }
        }

        const result = await callStripeMCPTool(toolName, parsedArgs);
        const elapsed = Date.now() - startTime;
        console.log(`[ToolCall] ${toolName} returned result (${elapsed}ms)`);
        
        // MCP returns result in content array format
        if (result?.content && Array.isArray(result.content)) {
            const textContent = result.content.find((item) => item.type === 'text');
            if (textContent?.text) {
                console.log(`[ToolCall] Extracted text content from ${toolName} result`);
                return textContent.text;
            }
        }

        // Fallback: stringify the entire result
        console.log(`[ToolCall] Returning stringified result for ${toolName}`);
        return JSON.stringify(result);
    } catch (error) {
        const elapsed = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ToolCall] ${toolName} failed (${elapsed}ms):`, errorMessage);
        return JSON.stringify({ error: errorMessage });
    }
}

/**
 * Makes a streaming request to dat1 API with tool support
 */
async function makeDat1Request(messages, tools, temperature, maxTokens) {
    console.log('[dat1] Making request:', {
        messageCount: messages.length,
        toolCount: tools.length,
        temperature,
        maxTokens
    });
    
    if (!process.env.DAT1_API_KEY) {
        console.error('[dat1] ERROR: DAT1_API_KEY is not configured');
        throw new Error('DAT1_API_KEY is not configured');
    }

    const requestBody = {
        messages,
        temperature,
        stream: true,
        max_tokens: maxTokens,
    };

    // Only include tools if we have any
    if (tools.length > 0) {
        requestBody.tools = tools;
        console.log(`[dat1] Including ${tools.length} tool(s) in request`);
    }

    const startTime = Date.now();
    try {
        const response = await fetch(DAT1_API_URL, {
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
 * POST /api/search-product
 * Search for a product using AI analysis and real Stripe API
 */
app.post('/api/search-product', async (req, res) => {
    const { query } = req.body;
    console.log(`[API] POST /api/search-product - query: "${query}"`);

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Check if services are initialized
    if (!stripeService) {
        return res.status(500).json({ 
            error: 'Stripe service not available', 
            message: 'STRIPE_SECRET_KEY not configured' 
        });
    }

    if (!aiService) {
        console.warn('[API] AI service not available, proceeding with basic search');
    }

    try {
        let aiAnalysis = null;
        
        // Get AI analysis of the query if AI service is available
        if (aiService) {
            console.log('[API] Analyzing query with AI...');
            aiAnalysis = await aiService.analyzeProductQuery(query);
            console.log('[API] AI analysis completed:', JSON.stringify(aiAnalysis, null, 2));
        }

        // Search products using Stripe API
        console.log('[API] Searching products in Stripe...');
        const stripeProducts = await stripeService.searchProducts(query, aiAnalysis);
        
        if (stripeProducts.length === 0) {
            return res.json({
                products: [],
                message: 'No products found matching your search',
                query: query,
                analysis: aiAnalysis
            });
        }

        // Convert to simplified format
        const products = stripeProducts.map(product => 
            stripeService.convertProductToSimpleFormat(product)
        );

        let recommendation = null;
        
        // Generate AI recommendation if AI service is available
        if (aiService && products.length > 0) {
            console.log('[API] Generating AI recommendation...');
            recommendation = await aiService.generateProductRecommendation(products, query, aiAnalysis);
        }

        // Return the first product as the main result for compatibility with frontend
        const mainProduct = products[0];
        
        console.log(`[API] Product search completed: Found ${products.length} products, returning "${mainProduct.name}"`);
        
        res.json({ 
            product: mainProduct,
            allProducts: products,
            totalFound: products.length,
            recommendation: recommendation,
            analysis: aiAnalysis,
            query: query
        });
    } catch (error) {
        console.error('[API] Product search error:', error);
        res.status(500).json({ 
            error: error.message,
            query: query,
            fallback: true
        });
    }
});

/**
 * POST /api/create-subscription
 * Create a real Stripe subscription for recurring product purchases
 */
app.post('/api/create-subscription', async (req, res) => {
    const { product, frequency, customerEmail } = req.body;
    console.log(`[API] POST /api/create-subscription - product: ${product.name}, frequency: ${frequency}`);

    if (!stripeService) {
        return res.status(500).json({ 
            success: false, 
            error: 'Stripe service not available',
            message: 'STRIPE_SECRET_KEY not configured'
        });
    }

    try {
        // For demo purposes, we'll create a mock subscription response
        // In a real implementation, you would:
        // 1. Create or find a customer
        // 2. Create a price for the product if it doesn't exist
        // 3. Create the subscription
        
        console.log('[API] Creating subscription with Stripe...');
        
        // Simulate subscription creation (replace with real Stripe calls)
        const subscription = await simulateRealSubscriptionCreation(product, frequency, customerEmail);
        
        console.log(`[API] Subscription created: ${subscription.id}`);
        res.json({
            success: true,
            subscriptionId: subscription.id,
            nextCharge: subscription.nextCharge,
            amount: subscription.amount,
            interval: subscription.interval,
            customerId: subscription.customerId
        });
    } catch (error) {
        console.error('[API] Subscription creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// In-memory storage for subscriptions (for demo purposes)
const subscriptionsStore = [];

/**
 * Simulates real subscription creation (enhanced version)
 * In production, this would use actual Stripe API calls
 */
async function simulateRealSubscriptionCreation(product, frequency, customerEmail) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const intervalMap = {
        'weekly': { interval: 'week', interval_count: 1 },
        'biweekly': { interval: 'week', interval_count: 2 },
        'monthly': { interval: 'month', interval_count: 1 },
        'quarterly': { interval: 'month', interval_count: 3 },
        'yearly': { interval: 'year', interval_count: 1 },
    };

    const intervalConfig = intervalMap[frequency] || intervalMap.monthly;
    
    // Calculate next charge date
    const now = new Date();
    const nextChargeDate = new Date(now);
    
    if (intervalConfig.interval === 'week') {
        nextChargeDate.setDate(now.getDate() + (7 * intervalConfig.interval_count));
    } else if (intervalConfig.interval === 'month') {
        nextChargeDate.setMonth(now.getMonth() + intervalConfig.interval_count);
    } else if (intervalConfig.interval === 'year') {
        nextChargeDate.setFullYear(now.getFullYear() + intervalConfig.interval_count);
    }

    // Generate more realistic IDs
    const customerId = `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription = {
        id: subscriptionId,
        customerId: customerId,
        product: {
            name: product.name,
            brand: product.brand,
            image: product.image,
            price: product.price,
            id: product.stripe_id || product.id
        },
        frequency: frequency,
        amount: product.price,
        currency: product.currency || 'usd',
        interval: intervalConfig.interval,
        intervalCount: intervalConfig.interval_count,
        nextCharge: nextChargeDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        }),
        customerEmail: customerEmail || 'customer@example.com',
        status: 'active',
        created: new Date().toISOString()
    };
    
    // Store subscription
    subscriptionsStore.push(subscription);
    
    return subscription;
}

/**
 * GET /api/subscriptions
 * Get all user subscriptions
 */
app.get('/api/subscriptions', async (req, res) => {
    console.log('[API] GET /api/subscriptions');
    
    try {
        // Calculate monthly total (convert all to monthly equivalent)
        let monthlyTotal = 0;
        
        subscriptionsStore.forEach(sub => {
            if (sub.status !== 'active') return;
            
            const price = sub.amount || 0;
            const intervalMultipliers = {
                'weekly': 4.33, // Average weeks per month
                'biweekly': 2.17,
                'monthly': 1,
                'quarterly': 0.33,
                'yearly': 0.083
            };
            
            const multiplier = intervalMultipliers[sub.frequency] || 1;
            monthlyTotal += price * multiplier;
        });
        
        res.json({
            subscriptions: subscriptionsStore,
            monthlyTotal: monthlyTotal,
            total: subscriptionsStore.length
        });
    } catch (error) {
        console.error('[API] Error fetching subscriptions:', error);
        res.status(500).json({ 
            error: error.message,
            subscriptions: [],
            monthlyTotal: 0
        });
    }
});

/**
 * POST /api/chat-stream
 * Streaming chat endpoint with Stripe MCP tool support
 */
app.post('/api/chat-stream', async (req, res) => {
    const requestStartTime = Date.now();
    const { messages } = req.body;
    console.log(`[API] POST /api/chat-stream - ${messages.length} messages`);

    if (!process.env.DAT1_API_KEY) {
        console.error('[API] ERROR: DAT1_API_KEY is not configured');
        return res.status(500).json({ error: 'DAT1_API_KEY is not configured' });
    }

    // Get Stripe tools (cached)
    let tools = [];
    const toolsStartTime = Date.now();
    try {
        console.log('[API] Fetching Stripe tools...');
        tools = await getStripeTools();
        const toolsElapsed = Date.now() - toolsStartTime;
        console.log(`[API] Loaded ${tools.length} Stripe tools (${toolsElapsed}ms)`);
    } catch (error) {
        const toolsElapsed = Date.now() - toolsStartTime;
        console.error(`[API] Failed to fetch Stripe tools (${toolsElapsed}ms):`, error.message);
        // Continue without tools if fetch fails
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const temperature = req.body.temperature || DEFAULT_TEMPERATURE;
    const maxTokens = req.body.max_tokens || DEFAULT_MAX_TOKENS;
    let conversationMessages = [...messages];
    let iterationCount = 0;
    const MAX_ITERATIONS = 10; // Prevent infinite loops

    try {
        while (iterationCount < MAX_ITERATIONS) {
            iterationCount++;
            console.log(`[API] Iteration ${iterationCount}/${MAX_ITERATIONS}`);

            // Make request to dat1 API
            console.log(`[API] Making request to dat1 API with ${conversationMessages.length} messages, ${tools.length} tools`);
            const dat1StartTime = Date.now();
            const response = await makeDat1Request(conversationMessages, tools, temperature, maxTokens);
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

            let accumulatedContent = '';
            let toolCalls = [];
            let finalData = null;
            let hasToolCalls = false;

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

                // Check for tool calls
                const choice = parsed.choices?.[0];
                if (choice) {
                    // Handle delta (streaming)
                    if (choice.delta) {
                        if (choice.delta.content) {
                            accumulatedContent += choice.delta.content;
                            // Forward content chunks
                            res.write(chunk + '\n');
                        }

                        if (choice.delta.tool_calls) {
                            hasToolCalls = true;
                            for (const toolCall of choice.delta.tool_calls) {
                                const index = toolCall.index ?? 0;
                                if (!toolCalls[index]) {
                                    toolCalls[index] = {
                                        id: toolCall.id || `call_${Date.now()}_${index}`,
                                        type: toolCall.type || 'function',
                                        function: {
                                            name: toolCall.function?.name || '',
                                            arguments: toolCall.function?.arguments || '',
                                        },
                                    };
                                } else {
                                    // Append to existing tool call
                                    toolCalls[index].function.arguments += toolCall.function?.arguments || '';
                                    if (toolCall.id) {
                                        toolCalls[index].id = toolCall.id;
                                    }
                                    if (toolCall.function?.name) {
                                        toolCalls[index].function.name = toolCall.function.name;
                                    }
                                }
                            }
                        }
                    }

                    // Handle complete message (non-streaming tool calls)
                    if (choice.message?.tool_calls) {
                        hasToolCalls = true;
                        toolCalls = choice.message.tool_calls;
                    }

                    // Check finish reason
                    if (choice.finish_reason === 'tool_calls') {
                        hasToolCalls = true;
                    }

                    // Capture final data
                    if (parsed.usage || parsed.timings) {
                        finalData = parsed;
                    }
                }
            }

            // If we have tool calls, execute them
            if (hasToolCalls && toolCalls.length > 0) {
                console.log(`[API] Executing ${toolCalls.length} tool call(s):`, 
                    toolCalls.map(tc => tc.function.name).join(', '));
                
                // Add assistant message with tool calls
                conversationMessages.push({
                    role: 'assistant',
                    content: accumulatedContent || null,
                    tool_calls: toolCalls,
                });

                // Execute all tool calls
                const toolExecutionStartTime = Date.now();
                const toolResults = await Promise.all(
                    toolCalls.map(async (toolCall, index) => {
                        const toolStartTime = Date.now();
                        console.log(`[API] Executing tool ${index + 1}/${toolCalls.length}: ${toolCall.function.name}`);
                        try {
                            const result = await executeToolCall(
                                toolCall.function.name,
                                toolCall.function.arguments
                            );
                            const toolElapsed = Date.now() - toolStartTime;
                            console.log(`[API] Tool ${toolCall.function.name} completed (${toolElapsed}ms)`);
                            return {
                                role: 'tool',
                                content: result,
                                tool_call_id: toolCall.id,
                            };
                        } catch (error) {
                            const toolElapsed = Date.now() - toolStartTime;
                            console.error(`[API] Tool ${toolCall.function.name} failed (${toolElapsed}ms):`, error.message);
                            return {
                                role: 'tool',
                                content: JSON.stringify({ error: error.message }),
                                tool_call_id: toolCall.id,
                            };
                        }
                    })
                );
                const toolExecutionElapsed = Date.now() - toolExecutionStartTime;
                console.log(`[API] All ${toolCalls.length} tool(s) executed (${toolExecutionElapsed}ms)`);

                // Add tool results to messages
                conversationMessages.push(...toolResults);

                // Continue loop to get final response
                console.log(`[API] Continuing to next iteration with ${conversationMessages.length} messages`);
                continue;
            }

            // No tool calls, send final data and close
            const totalElapsed = Date.now() - requestStartTime;
            console.log(`[API] Request completed successfully (${totalElapsed}ms, ${iterationCount} iteration(s))`);
            if (finalData) {
                res.write(`data: ${JSON.stringify(finalData)}\n\n`);
            }

            res.write('data: [DONE]\n\n');
            res.end();
            return;
        }

        // Max iterations reached
        const totalElapsed = Date.now() - requestStartTime;
        console.warn(`[API] Maximum iterations reached (${totalElapsed}ms)`);
        res.write(`data: ${JSON.stringify({ error: 'Maximum iterations reached' })}\n\n`);
        res.end();
    } catch (error) {
        const totalElapsed = Date.now() - requestStartTime;
        console.error(`[API] Error in chat-stream (${totalElapsed}ms):`, error);
        console.error('[API] Error stack:', error.stack);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Make sure DAT1_API_KEY and STRIPE_SECRET_KEY are set in your environment`);
});

