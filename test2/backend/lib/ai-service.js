/**
 * AI Service - DAT1 integration for intelligent product search analysis
 */

class AIService {
    constructor(apiKey, apiUrl = 'https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat') {
        if (!apiKey) {
            throw new Error('DAT1 API key is required');
        }
        
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    /**
     * Analyze user query to extract product search parameters
     */
    async analyzeProductQuery(userQuery) {
        try {
            console.log(`[AIService] Analyzing query: "${userQuery}"`);
            
            const systemPrompt = `You are a product search analyzer. Your job is to analyze user queries and extract structured information for product search.

Given a user query, extract and return ONLY a valid JSON object with the following structure:
{
    "keywords": ["keyword1", "keyword2"],
    "category": "category_name_or_null",
    "intent": "search|compare|buy|learn",
    "priceRange": {"min": number_or_null, "max": number_or_null},
    "urgency": "low|medium|high",
    "productType": "specific_product_type_or_general"
}

Rules:
- Extract relevant keywords that would help find products
- Identify the main category if clear from the query
- Determine user intent (search, compare, buy, learn)
- Extract price range if mentioned (convert to numbers)
- Assess urgency from language used
- Identify if looking for specific product type or general browsing
- Return ONLY valid JSON, no other text or explanation
- Use null for missing information`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userQuery }
            ];

            const requestBody = {
                messages: messages,
                temperature: 0.3, // Lower temperature for more consistent JSON output
                max_tokens: 300,
                stream: false
            };

            console.log('[AIService] Making request to DAT1 API...');
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`DAT1 API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from DAT1 API');
            }

            const aiResponse = data.choices[0].message.content.trim();
            console.log('[AIService] Raw AI response:', aiResponse);

            // Parse JSON response
            let analysis;
            try {
                // Clean the response to extract JSON (remove any markdown or extra text)
                const jsonMatch = aiResponse.match(/\{.*\}/s);
                const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
                analysis = JSON.parse(jsonStr);
            } catch (parseError) {
                console.warn('[AIService] Failed to parse AI response as JSON, using fallback analysis');
                analysis = this.fallbackAnalysis(userQuery);
            }

            // Validate and clean the analysis
            analysis = this.validateAnalysis(analysis, userQuery);
            
            console.log('[AIService] Final analysis:', JSON.stringify(analysis, null, 2));
            return analysis;

        } catch (error) {
            console.error('[AIService] Error analyzing query:', error.message);
            // Return fallback analysis instead of throwing
            return this.fallbackAnalysis(userQuery);
        }
    }

    /**
     * Validate and clean AI analysis results
     */
    validateAnalysis(analysis, originalQuery) {
        const cleaned = {
            keywords: Array.isArray(analysis.keywords) ? analysis.keywords : this.extractKeywords(originalQuery),
            category: typeof analysis.category === 'string' ? analysis.category : null,
            intent: ['search', 'compare', 'buy', 'learn'].includes(analysis.intent) ? analysis.intent : 'search',
            priceRange: this.validatePriceRange(analysis.priceRange),
            urgency: ['low', 'medium', 'high'].includes(analysis.urgency) ? analysis.urgency : 'medium',
            productType: typeof analysis.productType === 'string' ? analysis.productType : 'general'
        };

        // Ensure keywords array has content
        if (!cleaned.keywords || cleaned.keywords.length === 0) {
            cleaned.keywords = this.extractKeywords(originalQuery);
        }

        return cleaned;
    }

    /**
     * Validate price range object
     */
    validatePriceRange(priceRange) {
        if (!priceRange || typeof priceRange !== 'object') {
            return { min: null, max: null };
        }

        return {
            min: typeof priceRange.min === 'number' && priceRange.min > 0 ? priceRange.min : null,
            max: typeof priceRange.max === 'number' && priceRange.max > 0 ? priceRange.max : null
        };
    }

    /**
     * Fallback analysis when AI fails
     */
    fallbackAnalysis(query) {
        console.log('[AIService] Using fallback analysis');
        
        const lowerQuery = query.toLowerCase();
        
        // Extract basic keywords
        const keywords = this.extractKeywords(query);
        
        // Simple category detection
        let category = null;
        const categoryKeywords = {
            'skincare': ['cream', 'serum', 'moisturizer', 'cleanser', 'toner', 'mask'],
            'makeup': ['lipstick', 'foundation', 'mascara', 'eyeshadow', 'concealer'],
            'health': ['vitamin', 'supplement', 'medicine', 'wellness'],
            'clothing': ['shirt', 'dress', 'pants', 'shoes', 'jacket', 'clothing'],
            'electronics': ['phone', 'computer', 'laptop', 'tablet', 'headphones']
        };

        for (const [cat, words] of Object.entries(categoryKeywords)) {
            if (words.some(word => lowerQuery.includes(word))) {
                category = cat;
                break;
            }
        }

        // Simple intent detection
        let intent = 'search';
        if (lowerQuery.includes('buy') || lowerQuery.includes('purchase')) {
            intent = 'buy';
        } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs')) {
            intent = 'compare';
        } else if (lowerQuery.includes('learn') || lowerQuery.includes('what is') || lowerQuery.includes('how')) {
            intent = 'learn';
        }

        // Simple price range extraction
        const priceRegex = /\$(\d+(?:\.\d{2})?)/g;
        const prices = [];
        let match;
        while ((match = priceRegex.exec(lowerQuery)) !== null) {
            prices.push(parseFloat(match[1]));
        }

        let priceRange = { min: null, max: null };
        if (prices.length === 1) {
            priceRange.max = prices[0];
        } else if (prices.length >= 2) {
            priceRange.min = Math.min(...prices);
            priceRange.max = Math.max(...prices);
        }

        return {
            keywords,
            category,
            intent,
            priceRange,
            urgency: 'medium',
            productType: category || 'general'
        };
    }

    /**
     * Extract keywords from query using simple text processing
     */
    extractKeywords(query) {
        // Remove common stop words and extract meaningful terms
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must']);
        
        const words = query.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
        
        // Remove duplicates and return
        return [...new Set(words)];
    }

    /**
     * Generate product recommendation using AI
     */
    async generateProductRecommendation(products, userQuery, userAnalysis) {
        try {
            console.log(`[AIService] Generating recommendation for ${products.length} products`);
            
            const systemPrompt = `You are a helpful product recommendation assistant. Based on the user's query and the available products, recommend the best product(s) and explain why.

Provide a clear, helpful response that:
1. Recommends the most suitable product(s)
2. Explains why these products match the user's needs
3. Mentions key features or benefits
4. Is conversational and friendly

Keep the response concise but informative.`;

            const productSummary = products.slice(0, 5).map(p => 
                `- ${p.name}: ${p.description} (Price: $${p.price})`
            ).join('\n');

            const userMessage = `User query: "${userQuery}"

Available products:
${productSummary}

User is looking for: ${userAnalysis.productType} (Intent: ${userAnalysis.intent})

Please recommend the best product(s) and explain why.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ];

            const requestBody = {
                messages: messages,
                temperature: 0.7,
                max_tokens: 500,
                stream: false
            };

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`DAT1 API error: ${response.status}`);
            }

            const data = await response.json();
            const recommendation = data.choices[0].message.content.trim();
            
            console.log('[AIService] Generated recommendation');
            return recommendation;

        } catch (error) {
            console.error('[AIService] Error generating recommendation:', error.message);
            return `Based on your search for "${userQuery}", I found ${products.length} matching product${products.length === 1 ? '' : 's'}. ${products.length > 0 ? `The top recommendation is ${products[0].name} - ${products[0].description}` : 'Please try a different search term.'}`;
        }
    }
}

module.exports = { AIService };