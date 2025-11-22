import Stripe from 'stripe';
import { StripeProduct } from '../types';

export class StripeService {
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async getAllProducts(): Promise<StripeProduct[]> {
    try {
      console.log('[StripeService] Fetching all products...');
      
      const products: StripeProduct[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const response = await this.stripe.products.list({
          limit: 100,
          starting_after: startingAfter,
          expand: ['data.default_price'],
        });

        console.log(`[StripeService] Fetched ${response.data.length} products`);

        for (const product of response.data) {
          products.push({
            id: product.id,
            name: product.name,
            description: product.description || undefined,
            images: product.images,
            metadata: product.metadata,
            active: product.active,
            created: product.created,
            updated: product.updated,
            url: product.url || undefined,
            default_price: product.default_price ? {
              id: typeof product.default_price === 'string' 
                ? product.default_price 
                : product.default_price.id,
              unit_amount: typeof product.default_price === 'string' 
                ? null 
                : product.default_price.unit_amount,
              currency: typeof product.default_price === 'string' 
                ? 'usd' 
                : product.default_price.currency,
            } : null,
          });
        }

        hasMore = response.has_more;
        if (hasMore && response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id;
        }
      }

      console.log(`[StripeService] Total products fetched: ${products.length}`);
      return products;
    } catch (error) {
      console.error('[StripeService] Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProductsByUrl(url: string): Promise<StripeProduct[]> {
    try {
      console.log(`[StripeService] Fetching products for URL: ${url}`);
      
      // Get all products first
      const allProducts = await this.getAllProducts();
      
      // Filter products that match the URL in metadata or url field
      const matchingProducts = allProducts.filter(product => {
        // Check if the product URL matches
        if (product.url && product.url.includes(url)) {
          return true;
        }
        
        // Check if the URL is in metadata
        if (product.metadata) {
          for (const [key, value] of Object.entries(product.metadata)) {
            if (value.includes(url) || key.toLowerCase().includes('url') && value === url) {
              return true;
            }
          }
        }
        
        // Check if domain matches (simple domain extraction)
        try {
          const productDomain = product.url ? new URL(product.url).hostname : null;
          const targetDomain = new URL(url).hostname;
          
          if (productDomain && productDomain === targetDomain) {
            return true;
          }
        } catch {
          // Invalid URL, skip domain comparison
        }
        
        return false;
      });

      console.log(`[StripeService] Found ${matchingProducts.length} products matching URL: ${url}`);
      return matchingProducts;
    } catch (error) {
      console.error('[StripeService] Error fetching products by URL:', error);
      throw new Error(`Failed to fetch products for URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}