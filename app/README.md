# Stripe Product Finder

A modern web application built with Node.js, TypeScript, and Tailwind CSS that allows you to search and display Stripe products by website URL.

## Features

- 🔍 **URL-based Product Search**: Enter a website URL to find all related Stripe products
- 📊 **Complete Product Listing**: View all products in your Stripe account
- 🎨 **Modern UI**: Clean, responsive interface built with Tailwind CSS
- 🔄 **Multiple Views**: Switch between grid and list views
- 📈 **Sorting Options**: Sort products by name, creation date, update date, or price
- 💰 **Price Display**: Formatted price display with currency support
- 🔗 **Direct Links**: Quick access to product URLs
- ⚡ **Real-time Loading**: Loading states and error handling
- 🏷️ **Product Status**: Visual indicators for active/inactive products

## Screenshots

The application provides:
- A clean header with product count and refresh options
- URL input field with validation
- Loading states with animated spinners
- Error handling with clear error messages
- Grid and list view options for products
- Detailed product cards showing images, names, descriptions, prices, and metadata

## Technology Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** for REST API
- **Stripe SDK** for payment data
- **CORS** enabled for frontend communication

### Frontend
- **HTML5** with semantic structure
- **Tailwind CSS** for styling
- **Font Awesome** for icons
- **Vanilla JavaScript** for interactivity

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Stripe account with API access

### Installation

1. **Clone and navigate to the app directory**:
   ```bash
   cd app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Stripe credentials:
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   PORT=3000
   ```

4. **Build the TypeScript code**:
   ```bash
   npm run build
   ```

5. **Start the server**:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### GET `/api/products`
Retrieves all products from your Stripe account.

**Response:**
```json
{
  "products": [
    {
      "id": "prod_123",
      "name": "Product Name",
      "description": "Product description",
      "images": ["https://..."],
      "metadata": {},
      "active": true,
      "created": 1640995200,
      "updated": 1640995200,
      "url": "https://example.com/product",
      "default_price": {
        "id": "price_123",
        "unit_amount": 2000,
        "currency": "usd"
      }
    }
  ],
  "total": 1,
  "url": "all"
}
```

### POST `/api/products/by-url`
Finds products associated with a specific website URL.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "products": [...],
  "total": 5,
  "url": "https://example.com"
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

## Usage

### Search Products by URL

1. Enter a website URL in the search field (e.g., `https://example.com`)
2. Click "Search Products" or press Enter
3. The app will find all Stripe products associated with that URL
4. Results are displayed in a responsive grid or list view

### Load All Products

1. Click "Load All Products" to see your entire Stripe product catalog
2. Products are fetched and displayed with pagination support
3. Use the sorting dropdown to organize results

### Product Matching Logic

The app matches products to URLs using several criteria:
- **Direct URL match**: Products with URLs that contain the search URL
- **Metadata search**: Products with URL information in their metadata
- **Domain matching**: Products from the same domain as the search URL

### View Options

- **Grid View**: Card-based layout showing product images and key details
- **List View**: Compact row-based layout for quick scanning
- **Sorting**: Sort by name, creation date, last update, or price

## Project Structure

```
app/
├── src/
│   ├── controllers/
│   │   └── productController.ts    # API route handlers
│   ├── services/
│   │   └── stripeService.ts        # Stripe API integration
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   ├── app.ts                      # Express app configuration
│   └── server.ts                   # Server startup
├── public/
│   ├── index.html                  # Frontend HTML
│   └── app.js                      # Frontend JavaScript
├── dist/                           # Compiled TypeScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Remove built files

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `npm run dev` for automatic compilation and restart
3. Frontend changes in `public/` are served immediately
4. API changes require server restart

## Configuration

### Environment Variables

- `STRIPE_SECRET_KEY` - Your Stripe secret key (required)
- `PORT` - Server port (default: 3000)

### Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Use test keys for development (start with `sk_test_`)
4. Ensure your products have proper metadata or URLs for matching

## Error Handling

The application includes comprehensive error handling:

- **Invalid URLs**: Client-side validation with user-friendly messages
- **API Errors**: Stripe API errors are caught and displayed appropriately
- **Network Issues**: Loading states and retry options
- **Missing Configuration**: Clear error messages for setup issues

## Security Considerations

- API keys are stored in environment variables
- CORS is configured for frontend-backend communication  
- Input validation on all API endpoints
- No sensitive data exposed to client-side

## Deployment

### Production Build

1. Set production environment variables
2. Build the application: `npm run build`
3. Start the production server: `npm start`

### Environment Setup

For production deployment:
- Use live Stripe API keys (start with `sk_live_`)
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Use process managers like PM2 for production

## Troubleshooting

### Common Issues

1. **"Products not found" error**: Check if your Stripe products have URLs or relevant metadata
2. **Connection errors**: Verify your Stripe API key is correct and has proper permissions
3. **CORS errors**: Ensure the frontend and backend are running on expected ports

### Debug Mode

Enable verbose logging by checking the browser console and server logs for detailed information about API calls and responses.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.