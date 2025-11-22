# Test Guide for Enhanced Product Search API

## What's Changed

The `/api/search-product` endpoint has been enhanced to use:

1. **Real DAT1 AI Analysis**: Intelligent query parsing to understand user intent
2. **Real Stripe API Integration**: Searches actual products from your Stripe account
3. **Enhanced Response**: Returns AI recommendations and analysis data

## New Response Format

The endpoint now returns:
```json
{
    "product": {
        "id": "prod_xxx",
        "name": "Product Name",
        "brand": "Brand Name", 
        "description": "Product description",
        "price": 29.99,
        "currency": "usd",
        "image": "https://...",
        "active": true,
        "url": "https://...",
        "stripe_id": "prod_xxx"
    },
    "allProducts": [...], // Array of all matching products
    "totalFound": 5,
    "recommendation": "AI-generated recommendation text",
    "analysis": {
        "keywords": ["skincare", "moisturizer"],
        "category": "skincare", 
        "intent": "search",
        "priceRange": {"min": null, "max": 50},
        "urgency": "medium",
        "productType": "moisturizer"
    },
    "query": "moisturizing cream"
}
```

## Testing Steps

### 1. Environment Setup
```bash
cd test2/backend
# Make sure you have a real Stripe key in .env:
# STRIPE_SECRET_KEY=sk_test_your_real_key_here
# DAT1_API_KEY=your_real_dat1_key_here
```

### 2. Start the Server
```bash
npm start
```

### 3. Test the Enhanced Endpoint

#### With Real Stripe + AI (if keys configured):
```bash
curl -X POST http://localhost:3000/api/search-product \
  -H "Content-Type: application/json" \
  -d '{"query": "moisturizing cream for dry skin"}'
```

#### Expected Behavior:
- **With Real Keys**: Uses DAT1 AI to analyze query, searches real Stripe products
- **Without Keys**: Graceful fallback with clear error messages
- **Mixed Setup**: Works with available services (e.g., Stripe without AI)

### 4. Test Different Query Types

```bash
# Price-specific query
curl -X POST http://localhost:3000/api/search-product \
  -H "Content-Type: application/json" \
  -d '{"query": "vitamin c serum under $30"}'

# Category query  
curl -X POST http://localhost:3000/api/search-product \
  -H "Content-Type: application/json" \
  -d '{"query": "skincare products for sensitive skin"}'

# Brand query
curl -X POST http://localhost:3000/api/search-product \
  -H "Content-Type: application/json" \
  -d '{"query": "The Ordinary retinol"}'
```

## Error Handling

The API provides graceful fallbacks:

1. **No Stripe Key**: Returns configuration error
2. **No DAT1 Key**: Uses basic text search without AI analysis  
3. **No Products Found**: Returns empty results with helpful message
4. **API Errors**: Proper error responses with debug info

## Service Architecture

### StripeService (`lib/stripe-service.js`)
- Real Stripe API integration
- Intelligent product search and filtering
- AI-enhanced matching when analysis available
- Product format conversion

### AIService (`lib/ai-service.js`)  
- DAT1 API integration for query analysis
- Intent detection and keyword extraction
- Product recommendation generation
- Fallback analysis when AI unavailable

## Frontend Compatibility

The enhanced API maintains backward compatibility:
- Still returns `product` field as main result
- Frontend will work unchanged
- Additional data available for enhanced features

## Production Notes

For production deployment:
1. Use real Stripe live keys (sk_live_...)
2. Configure DAT1 production API key
3. Add rate limiting and caching
4. Monitor API usage and costs
5. Consider webhook integration for product updates

The enhanced system provides intelligent, AI-powered product search while maintaining full compatibility with the existing frontend.