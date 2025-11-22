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
 * Search for a product using AI and web search
 */
app.post('/api/search-product', async (req, res) => {
    const { query } = req.body;
    console.log(`[API] POST /api/search-product - query: "${query}"`);

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        // In a real implementation, this would call an actual product search API
        // For demo purposes, we'll simulate product data based on the query
        const product = await simulateProductSearch(query);
        
        console.log(`[API] Product found: ${product.name}`);
        res.json({ product });
    } catch (error) {
        console.error('[API] Product search error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/create-subscription
 * Create a Stripe subscription for recurring product purchases
 */
app.post('/api/create-subscription', async (req, res) => {
    const { product, frequency } = req.body;
    console.log(`[API] POST /api/create-subscription - product: ${product.name}, frequency: ${frequency}`);

    try {
        // In a real implementation, this would create an actual Stripe subscription
        const subscription = await createStripeSubscription(product, frequency);
        
        console.log(`[API] Subscription created: ${subscription.id}`);
        res.json({
            success: true,
            subscriptionId: subscription.id,
            nextCharge: subscription.nextCharge
        });
    } catch (error) {
        console.error('[API] Subscription creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Searches for product using dat1 AI and real web search
 */
async function simulateProductSearch(query) {
    console.log(`[ProductSearch] Searching for: "${query}"`);
    
    if (!process.env.DAT1_API_KEY) {
        console.warn('[ProductSearch] DAT1_API_KEY not configured, using fallback simulation');
        return simulateProductSearchFallback(query);
    }

    try {
        // Use dat1 AI to search for product information
        const productData = await searchProductWithAI(query);
        console.log(`[ProductSearch] AI search successful for: ${productData.name}`);
        return productData;
    } catch (error) {
        console.error('[ProductSearch] AI search failed, using fallback:', error.message);
        return simulateProductSearchFallback(query);
    }
}

/**
 * Uses dat1 AI to search and extract product information
 */
async function searchProductWithAI(query) {
    const systemPrompt = `You are a product information API that returns JSON. You must ALWAYS respond with valid JSON only.

Response format (respond with ONLY this JSON, no other text):
{
    "name": "Product Name",
    "brand": "Brand Name",
    "description": "Product description",
    "price": 29.99,
    "image": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400"
}

Rules:
1. Return ONLY valid JSON, no markdown, no code blocks, no explanation
2. Use realistic prices in USD (typically $15-50 for cosmetics)
3. Use Unsplash image URLs (https://images.unsplash.com/...)
4. Keep descriptions under 150 characters`;

    const userPrompt = `Product query: "${query}"

Return JSON with name, brand, description, price, and image URL. JSON only:`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    console.log('[ProductSearch] Calling dat1 API for product search...');
    const startTime = Date.now();

    const response = await fetch(DAT1_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.DAT1_API_KEY,
        },
        body: JSON.stringify({
            messages,
            temperature: 0.3,
            max_tokens: 1000,
            stream: false
        }),
    });

    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`dat1 API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log(`[ProductSearch] dat1 API responded in ${elapsed}ms`);
    
    // Extract the AI response
    const aiResponse = data.choices?.[0]?.message?.content || data.choices?.[0]?.text;
    
    if (!aiResponse) {
        throw new Error('No response from AI');
    }

    console.log('[ProductSearch] AI Response:', aiResponse.substring(0, 300));

    // Parse JSON from AI response
    let productData;
    try {
        // Clean the response - remove markdown code blocks if present
        let cleanResponse = aiResponse.trim();
        
        // Remove markdown code blocks
        cleanResponse = cleanResponse.replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
        
        // Try to extract JSON object
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            productData = JSON.parse(jsonMatch[0]);
        } else {
            productData = JSON.parse(cleanResponse);
        }
        
        console.log('[ProductSearch] Successfully parsed product:', productData.name);
    } catch (parseError) {
        console.error('[ProductSearch] Failed to parse AI response as JSON:', parseError.message);
        console.error('[ProductSearch] Raw response:', aiResponse);
        throw new Error('AI did not return valid JSON');
    }

    // Validate required fields
    if (!productData.name || !productData.price) {
        throw new Error('AI response missing required fields');
    }

    // Ensure price is a number
    if (typeof productData.price === 'string') {
        productData.price = parseFloat(productData.price.replace(/[^0-9.]/g, ''));
    }

    // Set defaults for missing fields
    productData.brand = productData.brand || 'Unknown Brand';
    productData.description = productData.description || 'High-quality product with excellent reviews.';
    productData.image = productData.image || 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80';

    return productData;
}

/**
 * Fallback product search when API is not available
 */
function simulateProductSearchFallback(query) {
    const lowerQuery = query.toLowerCase();
    
    // Simulate different products based on keywords
    if (lowerQuery.includes('cream') || lowerQuery.includes('moisturizer') || lowerQuery.includes('hydrat')) {
        return {
            name: 'Hydrating Cream',
            brand: 'Typology',
            description: 'A rich, nourishing cream that deeply hydrates and softens the skin. Formulated with natural ingredients for all skin types.',
            price: 24.99,
            image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80'
        };
    } else if (lowerQuery.includes('serum')) {
        return {
            name: 'Vitamin C Serum',
            brand: 'The Ordinary',
            description: 'A potent antioxidant serum that brightens skin and reduces signs of aging. Contains 15% pure L-Ascorbic Acid.',
            price: 18.99,
            image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80'
        };
    } else if (lowerQuery.includes('cleanser')) {
        return {
            name: 'Gentle Face Cleanser',
            brand: 'CeraVe',
            description: 'A gentle, non-foaming cleanser that removes dirt and makeup without stripping the skin of its natural moisture.',
            price: 14.99,
            image: 'https://images.unsplash.com/photo-1556228852-80f68f7c7b4e?w=400&q=80'
        };
    } else {
        // Default product
        return {
            name: query.charAt(0).toUpperCase() + query.slice(1),
            brand: 'Premium Brand',
            description: `High-quality ${query} product with excellent reviews. Perfect for daily use.`,
            price: 29.99,
            image: 'https://images.unsplash.com/photo-1556228578-dd6a8f7c7b4e?w=400&q=80'
        };
    }
}

/**
 * Creates a Stripe subscription (replace with actual Stripe API in production)
 */
async function createStripeSubscription(product, frequency) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const intervalMap = {
        'weekly': { interval: 'week', interval_count: 1 },
        'biweekly': { interval: 'week', interval_count: 2 },
        'monthly': { interval: 'month', interval_count: 1 },
        'quarterly': { interval: 'month', interval_count: 3 }
    };
    
    const intervalConfig = intervalMap[frequency] || intervalMap.monthly;
    
    // Calculate next charge date
    const nextChargeDate = new Date();
    const daysMap = { 'weekly': 7, 'biweekly': 14, 'monthly': 30, 'quarterly': 90 };
    nextChargeDate.setDate(nextChargeDate.getDate() + (daysMap[frequency] || 30));
    
    // In production, use actual Stripe API:
    // const subscription = await stripe.subscriptions.create({
    //   customer: customerId,
    //   items: [{ price: priceId }],
    //   ...intervalConfig
    // });
    
    return {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productName: product.name,
        amount: product.price,
        interval: intervalConfig.interval,
        intervalCount: intervalConfig.interval_count,
        nextCharge: nextChargeDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        })
    };
}

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

