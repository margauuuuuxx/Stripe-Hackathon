/**
 * Stripe Service - Real Stripe API integration for product management
 */

const Stripe = require('stripe');

class StripeService {
    constructor(secretKey) {
        if (!secretKey) {
            throw new Error('Stripe secret key is required');
        }
        
        this.stripe = new Stripe(secretKey, {
            apiVersion: '2025-11-17.clover',
        });
    }

    /**
     * Get all products from Stripe
     */
    async getAllProducts() {
        try {
            console.log('[StripeService] Fetching all products from Stripe...');
            
            const products = [];
            let hasMore = true;
            let startingAfter;

            while (hasMore) {
                const response = await this.stripe.products.list({
                    limit: 100,
                    starting_after: startingAfter,
                    expand: ['data.default_price'],
                });

                products.push(...response.data);
                hasMore = response.has_more;
                
                if (hasMore && response.data.length > 0) {
                    startingAfter = response.data[response.data.length - 1].id;
                }
            }

            console.log(`[StripeService] Fetched ${products.length} products from Stripe`);
            return products;
        } catch (error) {
            console.error('[StripeService] Error fetching products:', error.message);
            throw new Error(`Failed to fetch products from Stripe: ${error.message}`);
        }
    }

    /**
     * Search products by name or description using AI query
     */
    async searchProducts(query, aiAnalysis = null) {
        try {
            console.log(`[StripeService] Searching products for query: "${query}"`);
            
            const allProducts = await this.getAllProducts();
            
            // If we have AI analysis, use it to filter products more intelligently
            if (aiAnalysis && aiAnalysis.keywords) {
                console.log('[StripeService] Using AI analysis for smart filtering');
                return this.filterProductsWithAI(allProducts, query, aiAnalysis);
            }

            // Basic text search in product names and descriptions
            const lowerQuery = query.toLowerCase();
            const matchingProducts = allProducts.filter(product => {
                const nameMatch = product.name.toLowerCase().includes(lowerQuery);
                const descMatch = product.description && product.description.toLowerCase().includes(lowerQuery);
                const metadataMatch = this.searchInMetadata(product.metadata, lowerQuery);
                
                return nameMatch || descMatch || metadataMatch;
            });

            console.log(`[StripeService] Found ${matchingProducts.length} matching products`);
            return matchingProducts.slice(0, 10); // Limit to top 10 results
        } catch (error) {
            console.error('[StripeService] Error searching products:', error.message);
            throw error;
        }
    }

    /**
     * Filter products using AI analysis with improved fuzzy matching
     */
    filterProductsWithAI(products, originalQuery, aiAnalysis) {
        const { keywords, category, priceRange, intent } = aiAnalysis;
        
        let filteredProducts = products;

        // Filter by keywords with fuzzy matching
        if (keywords && keywords.length > 0) {
            filteredProducts = filteredProducts.filter(product => {
                const productText = `${product.name} ${product.description || ''}`.toLowerCase();
                
                // Try exact keyword match first
                const exactMatch = keywords.some(keyword => productText.includes(keyword.toLowerCase()));
                if (exactMatch) return true;
                
                // Try fuzzy matching for typos
                const fuzzyMatch = keywords.some(keyword => this.fuzzyMatch(keyword.toLowerCase(), productText));
                if (fuzzyMatch) return true;
                
                // Try individual word matching (e.g., "raspberry pi" -> ["raspberry", "pi"])
                const wordMatch = keywords.some(keyword => {
                    const keywordWords = keyword.toLowerCase().split(/\s+/);
                    return keywordWords.some(word => productText.includes(word));
                });
                
                return wordMatch;
            });
        }

        // Also try basic text search as fallback
        if (filteredProducts.length === 0) {
            console.log('[StripeService] AI filtering found no results, trying basic search...');
            const lowerQuery = originalQuery.toLowerCase();
            filteredProducts = products.filter(product => {
                const productText = `${product.name} ${product.description || ''}`.toLowerCase();
                
                // Try exact match
                if (productText.includes(lowerQuery)) return true;
                
                // Try fuzzy match
                if (this.fuzzyMatch(lowerQuery, productText)) return true;
                
                // Try individual words
                const queryWords = lowerQuery.split(/\s+/);
                return queryWords.some(word => word.length > 2 && productText.includes(word));
            });
        }

        // Filter by category if specified in metadata (make this optional if no category found)
        if (category && filteredProducts.length > 0) {
            const categoryFiltered = filteredProducts.filter(product => {
                if (!product.metadata) return false;
                const categoryMatch = Object.values(product.metadata).some(value => 
                    value.toLowerCase().includes(category.toLowerCase())
                );
                return categoryMatch;
            });
            
            // Only apply category filter if it doesn't eliminate all results
            if (categoryFiltered.length > 0) {
                filteredProducts = categoryFiltered;
            } else {
                console.log('[StripeService] Category filter would eliminate all results, skipping...');
            }
        }

        // Filter by price range
        if (priceRange && (priceRange.min !== null || priceRange.max !== null)) {
            filteredProducts = filteredProducts.filter(product => {
                if (!product.default_price || !product.default_price.unit_amount) return true; // Keep products without prices
                const price = product.default_price.unit_amount / 100; // Convert from cents
                
                if (priceRange.min !== null && price < priceRange.min) return false;
                if (priceRange.max !== null && price > priceRange.max) return false;
                
                return true;
            });
        }

        // Sort by relevance (basic scoring)
        filteredProducts.sort((a, b) => {
            const scoreA = this.calculateRelevanceScore(a, originalQuery, keywords);
            const scoreB = this.calculateRelevanceScore(b, originalQuery, keywords);
            return scoreB - scoreA;
        });

        return filteredProducts.slice(0, 10);
    }

    /**
     * Simple fuzzy matching for typos and variations
     */
    fuzzyMatch(needle, haystack) {
        // For short terms, use strict matching
        if (needle.length < 4) {
            return haystack.includes(needle);
        }
        
        // Calculate simple edit distance for fuzzy matching
        const tolerance = Math.floor(needle.length * 0.3); // Allow 30% difference
        
        // Split into words and check each
        const needleWords = needle.split(/\s+/);
        return needleWords.some(word => {
            if (word.length < 3) return haystack.includes(word);
            
            // Check if word exists with some character differences
            const haystackWords = haystack.split(/\s+/);
            return haystackWords.some(haystackWord => {
                if (Math.abs(word.length - haystackWord.length) > tolerance) return false;
                
                let differences = 0;
                const minLength = Math.min(word.length, haystackWord.length);
                
                for (let i = 0; i < minLength; i++) {
                    if (word[i] !== haystackWord[i]) differences++;
                }
                
                differences += Math.abs(word.length - haystackWord.length);
                return differences <= tolerance;
            });
        });
    }

    /**
     * Calculate relevance score for product ranking
     */
    calculateRelevanceScore(product, originalQuery, keywords = []) {
        let score = 0;
        const productText = `${product.name} ${product.description || ''}`.toLowerCase();
        const query = originalQuery.toLowerCase();

        // Direct query match in name (high score)
        if (product.name.toLowerCase().includes(query)) {
            score += 100;
        }

        // Direct query match in description (medium score)
        if (product.description && product.description.toLowerCase().includes(query)) {
            score += 50;
        }

        // Keyword matches
        keywords.forEach(keyword => {
            if (productText.includes(keyword.toLowerCase())) {
                score += 25;
            }
        });

        // Boost active products
        if (product.active) {
            score += 10;
        }

        // Boost products with prices
        if (product.default_price && product.default_price.unit_amount) {
            score += 5;
        }

        return score;
    }

    /**
     * Search in product metadata
     */
    searchInMetadata(metadata, query) {
        if (!metadata) return false;
        
        return Object.values(metadata).some(value => 
            value.toLowerCase().includes(query)
        );
    }

    /**
     * Convert Stripe product to simplified format
     */
    convertProductToSimpleFormat(product) {
        let price = 0;
        let currency = 'usd';

        if (product.default_price && product.default_price.unit_amount) {
            price = product.default_price.unit_amount / 100;
            currency = product.default_price.currency;
        }

        return {
            id: product.id,
            name: product.name,
            brand: product.metadata?.brand || 'Unknown Brand',
            description: product.description || '',
            price: price,
            currency: currency,
            image: product.images && product.images.length > 0 ? product.images[0] : null,
            active: product.active,
            url: product.url,
            metadata: product.metadata || {},
            stripe_id: product.id
        };
    }

    /**
     * Create a new Stripe subscription
     */
    async createSubscription(customerId, priceId, frequency = 'monthly') {
        try {
            console.log(`[StripeService] Creating subscription for customer ${customerId}, price ${priceId}`);
            
            const subscription = await this.stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                // Add frequency logic here if needed
            });

            console.log(`[StripeService] Created subscription: ${subscription.id}`);
            return subscription;
        } catch (error) {
            console.error('[StripeService] Error creating subscription:', error.message);
            throw new Error(`Failed to create subscription: ${error.message}`);
        }
    }
}

module.exports = { StripeService };