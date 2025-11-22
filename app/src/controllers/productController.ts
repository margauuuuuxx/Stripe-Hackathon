import { Request, Response } from 'express';
import { StripeService } from '../services/stripeService';
import { ProductListResponse, ErrorResponse } from '../types';

export class ProductController {
  private stripeService: StripeService;

  constructor(stripeSecretKey: string) {
    this.stripeService = new StripeService(stripeSecretKey);
  }

  async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      console.log('[ProductController] GET /api/products - Fetching all products');
      
      const products = await this.stripeService.getAllProducts();
      
      const response: ProductListResponse = {
        products,
        total: products.length,
        url: 'all',
      };

      res.json(response);
    } catch (error) {
      console.error('[ProductController] Error in getAllProducts:', error);
      
      const errorResponse: ErrorResponse = {
        error: 'FETCH_PRODUCTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch products',
      };

      res.status(500).json(errorResponse);
    }
  }

  async getProductsByUrl(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        const errorResponse: ErrorResponse = {
          error: 'INVALID_URL',
          message: 'URL is required and must be a string',
        };
        
        res.status(400).json(errorResponse);
        return;
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        const errorResponse: ErrorResponse = {
          error: 'INVALID_URL_FORMAT',
          message: 'Please provide a valid URL (e.g., https://example.com)',
        };
        
        res.status(400).json(errorResponse);
        return;
      }

      console.log(`[ProductController] POST /api/products/by-url - Fetching products for URL: ${url}`);
      
      const products = await this.stripeService.getProductsByUrl(url);
      
      const response: ProductListResponse = {
        products,
        total: products.length,
        url,
      };

      res.json(response);
    } catch (error) {
      console.error('[ProductController] Error in getProductsByUrl:', error);
      
      const errorResponse: ErrorResponse = {
        error: 'FETCH_PRODUCTS_BY_URL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch products for URL',
      };

      res.status(500).json(errorResponse);
    }
  }
}