"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const productController_1 = require("./controllers/productController");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Validate environment variables
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('ERROR: STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
}
console.log('[App] Environment check:', {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY.substring(0, 7),
    port: PORT,
});
// Initialize controllers
const productController = new productController_1.ProductController(process.env.STRIPE_SECRET_KEY);
// Routes
app.get('/api/products', productController.getAllProducts.bind(productController));
app.post('/api/products/by-url', productController.getProductsByUrl.bind(productController));
// Mock endpoint for testing frontend (temporary)
app.get('/api/products/mock', (req, res) => {
    const mockProducts = [
        {
            id: 'prod_mock_1',
            name: 'Test Product 1',
            description: 'This is a test product for frontend testing',
            images: ['https://via.placeholder.com/300x200?text=Product+1'],
            metadata: { website: 'https://example.com' },
            active: true,
            created: Math.floor(Date.now() / 1000) - 86400,
            updated: Math.floor(Date.now() / 1000),
            url: 'https://example.com/product1',
            default_price: {
                id: 'price_mock_1',
                unit_amount: 2999,
                currency: 'usd'
            }
        },
        {
            id: 'prod_mock_2',
            name: 'Test Product 2',
            description: 'Another test product',
            images: ['https://via.placeholder.com/300x200?text=Product+2'],
            metadata: {},
            active: false,
            created: Math.floor(Date.now() / 1000) - 172800,
            updated: Math.floor(Date.now() / 1000) - 3600,
            url: null,
            default_price: {
                id: 'price_mock_2',
                unit_amount: 4999,
                currency: 'usd'
            }
        },
        {
            id: 'prod_mock_3',
            name: 'Premium Service',
            description: null,
            images: [],
            metadata: { category: 'service' },
            active: true,
            created: Math.floor(Date.now() / 1000) - 259200,
            updated: Math.floor(Date.now() / 1000) - 7200,
            url: 'https://example.com/premium',
            default_price: null
        }
    ];
    res.json({
        products: mockProducts,
        total: mockProducts.length,
        url: 'mock'
    });
});
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});
// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Route not found',
        path: req.originalUrl,
    });
});
// Error handler
app.use((error, req, res, next) => {
    console.error('[App] Unhandled error:', error);
    res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map