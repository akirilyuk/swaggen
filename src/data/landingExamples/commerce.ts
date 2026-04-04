import type { LandingExample } from './types';

export const commerceExample: LandingExample = {
  id: 'commerce',
  title: 'E-commerce catalog',
  tagline:
    'Products, categories, carts, and orders — REST shape you would codegen from entities.',
  category: 'Retail',
  entities: [
    {
      name: 'Category',
      fields: [
        { name: 'slug', type: 'string' },
        { name: 'title', type: 'string' },
      ],
    },
    {
      name: 'Product',
      fields: [
        { name: 'sku', type: 'string' },
        { name: 'priceCents', type: 'number' },
        { name: 'stock', type: 'number' },
      ],
    },
    {
      name: 'Cart',
      fields: [
        { name: 'currency', type: 'string' },
        { name: 'expiresAt', type: 'date' },
      ],
    },
    {
      name: 'Order',
      fields: [
        { name: 'totalCents', type: 'number' },
        { name: 'placedAt', type: 'date' },
      ],
    },
  ],
  relations: [
    { from: 'Category', label: '1 — N', to: 'Product' },
    { from: 'Cart', label: 'N — M', to: 'Product' },
    { from: 'Order', label: 'N — M', to: 'Product' },
  ],
  operations: [
    {
      method: 'GET',
      path: '/products',
      summary: 'List with category filter',
    },
    {
      method: 'POST',
      path: '/carts/{cartId}/items',
      summary: 'Add SKU to cart',
    },
    {
      method: 'POST',
      path: '/orders',
      summary: 'Checkout cart',
    },
  ],
  snippetTitle: 'OpenAPI path (excerpt)',
  snippet: `"/products/{productId}": {
  "get": {
    "summary": "Get product by id",
    "parameters": [
      { "name": "productId", "in": "path", "required": true,
        "schema": { "type": "string", "format": "uuid" } }
    ],
    "responses": { "200": { "description": "OK" } }
  }
}`,
};
