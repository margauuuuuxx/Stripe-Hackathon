"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const stripeService_1 = require("../services/stripeService");
class ProductController {
    constructor(stripeSecretKey) {
        this.stripeService = new stripeService_1.StripeService(stripeSecretKey);
    }
    async getAllProducts(req, res) {
        try {
            console.log('[ProductController] GET /api/products - Fetching all products');
            const products = await this.stripeService.getAllProducts();
            const response = {
                products,
                total: products.length,
                url: 'all',
            };
            res.json(response);
        }
        catch (error) {
            console.error('[ProductController] Error in getAllProducts:', error);
            const errorResponse = {
                error: 'FETCH_PRODUCTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to fetch products',
            };
            res.status(500).json(errorResponse);
        }
    }
    async getProductsByUrl(req, res) {
        try {
            const { url } = req.body;
            if (!url || typeof url !== 'string') {
                const errorResponse = {
                    error: 'INVALID_URL',
                    message: 'URL is required and must be a string',
                };
                res.status(400).json(errorResponse);
                return;
            }
            // Validate URL format
            try {
                new URL(url);
            }
            catch {
                const errorResponse = {
                    error: 'INVALID_URL_FORMAT',
                    message: 'Please provide a valid URL (e.g., https://example.com)',
                };
                res.status(400).json(errorResponse);
                return;
            }
            console.log(`[ProductController] POST /api/products/by-url - Fetching products for URL: ${url}`);
            const products = await this.stripeService.getProductsByUrl(url);
            const response = {
                products,
                total: products.length,
                url,
            };
            res.json(response);
        }
        catch (error) {
            console.error('[ProductController] Error in getProductsByUrl:', error);
            const errorResponse = {
                error: 'FETCH_PRODUCTS_BY_URL_ERROR',
                message: error instanceof Error ? error.message : 'Failed to fetch products for URL',
            };
            res.status(500).json(errorResponse);
        }
    }
}
exports.ProductController = ProductController;
//# sourceMappingURL=productController.js.map