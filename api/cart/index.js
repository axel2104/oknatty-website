// ============================================
// OKNATTY + ELEMENT - Carrello Headless API
// Cloudflare Workers + Durable Objects
// ============================================

// Configurazione Shopify
const SHOPIFY_CONFIG = {
    domain: 'bu4ksb-yb.myshopify.com',
    storefrontToken: '5d852e4156a7c1c496174a37a01e6356',
    apiVersion: '2024-10'
};

const STOREFRONT_URL = `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;

// ============================================
// DURABLE OBJECT - Carrello persistente
// ============================================
export class CartDurableObject {
    constructor(state) {
        this.state = state;
    }

    async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // CORS headers per tutte le risposte
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Cart-ID',
            'Access-Control-Max-Age': '86400',
            'Content-Type': 'application/json'
        };

        if (method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        try {
            let response;

            if (path === '/cart' && method === 'GET') {
                response = await this.getCart();
            } else if (path === '/cart' && method === 'POST') {
                const body = await request.json();
                response = await this.addItem(body);
            } else if (path === '/cart/item' && method === 'PUT') {
                const body = await request.json();
                response = await this.updateItem(body);
            } else if (path === '/cart/item' && method === 'DELETE') {
                const body = await request.json();
                response = await this.removeItem(body);
            } else if (path === '/cart/clear' && method === 'POST') {
                response = await this.clearCart();
            } else if (path === '/cart/checkout' && method === 'POST') {
                response = await this.createCheckout();
            } else {
                response = { error: 'Not found' };
                return new Response(JSON.stringify(response), { 
                    status: 404, 
                    headers: corsHeaders 
                });
            }

            return new Response(JSON.stringify(response), { 
                status: 200, 
                headers: corsHeaders 
            });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { 
                status: 500, 
                headers: corsHeaders 
            });
        }
    }

    async getCart() {
        const cart = await this.state.storage.get('cart') || {
            id: crypto.randomUUID(),
            items: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return cart;
    }

    async addItem({ handle, variantId, quantity, price, title, brand, image }) {
        let cart = await this.getCart();
        
        const existingIndex = cart.items.findIndex(item => item.handle === handle);
        
        if (existingIndex >= 0) {
            cart.items[existingIndex].quantity += quantity;
        } else {
            cart.items.push({
                handle,
                variantId,
                quantity,
                price,
                title,
                brand: brand || 'OKNATTY',
                image,
                addedAt: Date.now()
            });
        }
        
        cart.updatedAt = Date.now();
        await this.state.storage.put('cart', cart);
        return cart;
    }

    async updateItem({ handle, quantity }) {
        let cart = await this.getCart();
        const item = cart.items.find(i => i.handle === handle);
        
        if (!item) return cart;
        
        if (quantity <= 0) {
            cart.items = cart.items.filter(i => i.handle !== handle);
        } else {
            item.quantity = quantity;
        }
        
        cart.updatedAt = Date.now();
        await this.state.storage.put('cart', cart);
        return cart;
    }

    async removeItem({ handle }) {
        let cart = await this.getCart();
        cart.items = cart.items.filter(i => i.handle !== handle);
        cart.updatedAt = Date.now();
        await this.state.storage.put('cart', cart);
        return cart;
    }

    async clearCart() {
        const newCart = {
            id: crypto.randomUUID(),
            items: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await this.state.storage.put('cart', newCart);
        return newCart;
    }

    async createCheckout() {
        const cart = await this.getCart();
        
        if (cart.items.length === 0) {
            return { error: 'Cart is empty' };
        }

        // Crea carrello Shopify via GraphQL
        const lineItems = cart.items.map(item => ({
            merchandiseId: item.variantId,
            quantity: item.quantity
        }));

        const query = `
            mutation cartCreate($input: CartInput!) {
                cartCreate(input: $input) {
                    cart {
                        id
                        checkoutUrl
                        lines(first: 100) {
                            edges {
                                node {
                                    merchandise {
                                        ... on ProductVariant {
                                            product {
                                                title
                                            }
                                        }
                                    }
                                    quantity
                                }
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const response = await fetch(STOREFRONT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontToken
            },
            body: JSON.stringify({
                query,
                variables: {
                    input: {
                        lines: lineItems
                    }
                }
            })
        });

        const data = await response.json();
        
        if (data?.data?.cartCreate?.userErrors?.length > 0) {
            return { 
                error: 'Shopify error', 
                details: data.data.cartCreate.userErrors 
            };
        }

        const shopifyCart = data?.data?.cartCreate?.cart;
        
        if (!shopifyCart) {
            return { error: 'Failed to create checkout' };
        }

        // Salva checkout URL nel carrello
        cart.checkoutUrl = shopifyCart.checkoutUrl;
        cart.shopifyCartId = shopifyCart.id;
        await this.state.storage.put('cart', cart);

        return {
            cart,
            checkoutUrl: shopifyCart.checkoutUrl
        };
    }
}

// ============================================
// WORKER - Routing e gestione CORS
// ============================================
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // Estrai cart ID dal header o genera nuovo
        let cartId = request.headers.get('X-Cart-ID');
        
        if (!cartId) {
            // Genera nuovo ID se non fornito
            cartId = crypto.randomUUID();
        }

        // Ottieni o crea Durable Object
        const id = env.CART_DURABLE_OBJECT.idFromName(cartId);
        const cartObject = env.CART_DURABLE_OBJECT.get(id);

        // Inoltra la richiesta al Durable Object
        const response = await cartObject.fetch(request.url, {
            method: request.method,
            headers: {
                ...Object.fromEntries(request.headers),
                'X-Cart-ID': cartId
            },
            body: request.body
        });

        // Aggiungi cart ID alla risposta
        const newResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                ...Object.fromEntries(response.headers),
                'X-Cart-ID': cartId
            }
        });

        return newResponse;
    }
};
