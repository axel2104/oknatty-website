// ============================================
// OKNATTY + ELEMENT - Carrello Headless Client
// Connette a API Cloudflare Workers/Durable Objects
// ============================================

const API_CONFIG = {
    // URL dell'API carrello (da aggiornare dopo deploy)
    baseUrl: 'https://cart.oknatty.com', // o https://cart-api.oknatty-website.workers.dev
    // Fallback: se l'API non è disponibile, usa localStorage
    fallbackToLocalStorage: true
};

// ============================================
// CONFIGURAZIONE PRODOTTI
// ============================================
const SHOPIFY_CONFIG = {
    domain: 'bu4ksb-yb.myshopify.com',
    storefrontToken: '5d852e4156a7c1c496174a37a01e6356',
    
    // OKNATTY products
    productHandles: {
        'cioccolato-fondente': { handle: 'cioccolato-fondente', price: 9.90, title: 'Cioccolato Fondente', brand: 'OKNATTY' },
        'cioccolato-cocco': { handle: 'cioccolato-cocco', price: 9.90, title: 'Cioccolato e Cocco', brand: 'OKNATTY' },
        'caramello-salato': { handle: 'caramello-salato', price: 9.90, title: 'Caramello Salato', brand: 'OKNATTY' },
        'crema-nocciola-bianca': { handle: 'crema-nocciola-bianca', price: 9.90, title: 'Crema Nocciola Bianca', brand: 'OKNATTY' },
        'cacao-nocciola': { handle: 'cacao-nocciola', price: 9.90, title: 'Cacao e Nocciola', brand: 'OKNATTY' },
        'crema-cocco-bar': { handle: 'crema-cocco-bar', price: 9.90, title: 'Crema Cocco Bar', brand: 'OKNATTY' },
        'burro-arachidi': { handle: 'burro-arachidi', price: 8.90, title: 'Burro d\'Arachidi', brand: 'OKNATTY' },
        'crema-di-riso': { handle: 'crema-di-riso', price: 13.90, title: 'Crema di Riso', brand: 'OKNATTY' }
    },
    
    // ELEMENT products (cross-sell)
    elementProducts: [
        { handle: 'novapro-ultra-pure-whey', title: 'NOVAPRO ULTRA PURE WHEY', price: 29.90, subtitle: '900g', brand: 'ELEMENT' },
        { handle: 'aminoleader-essential-aminoacid', title: 'AMINOLEADER', price: 24.90, subtitle: 'Aminoacidi Essenziali 250g', brand: 'ELEMENT' },
        { handle: 'forge-creatina-monoidrato', title: 'FORGE CREATINA', price: 19.90, subtitle: '200 Mesh 240g', brand: 'ELEMENT' },
        { handle: 'kagliostro-hardcore-focus-formula', title: 'KAGLIOSTRO', price: 34.90, subtitle: 'Pre-Workout 250g', brand: 'ELEMENT' },
        { handle: 'reborn-full-recovery-formula', title: 'REBORN', price: 32.90, subtitle: 'Recovery 600g', brand: 'ELEMENT' },
        { handle: 'journey-vit-24-h', title: 'JOURNEY VIT', price: 22.90, subtitle: 'Multivitaminico 120cps', brand: 'ELEMENT' }
    ]
};

// ============================================
// CART ID - Persistente cross-domain
// ============================================
const CART_ID_KEY = 'oknatty_cart_id';
const LOCAL_CART_KEY = 'oknatty_cart_fallback';

function getCartId() {
    return localStorage.getItem(CART_ID_KEY) || null;
}

function setCartId(id) {
    localStorage.setItem(CART_ID_KEY, id);
}

// ============================================
// API CLIENT
// ============================================
let apiAvailable = true;

async function apiCall(endpoint, method = 'GET', body = null) {
    const cartId = getCartId();
    const headers = {
        'Content-Type': 'application/json'
    };
    if (cartId) {
        headers['X-Cart-ID'] = cartId;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        
        // Salva nuovo cart ID se presente
        const newCartId = response.headers.get('X-Cart-ID');
        if (newCartId) {
            setCartId(newCartId);
        }
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        apiAvailable = true;
        return await response.json();
        
    } catch (err) {
        console.warn('API non disponibile, uso localStorage:', err.message);
        apiAvailable = false;
        return null;
    }
}

// ============================================
// LOCALSTORAGE FALLBACK
// ============================================
function getLocalCart() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_CART_KEY)) || { items: [], checkoutUrl: null };
    } catch {
        return { items: [], checkoutUrl: null };
    }
}

function saveLocalCart(cart) {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

// ============================================
// SHOPIFY STOREFRONT API - GraphQL
// ============================================
const STOREFRONT_URL = `https://${SHOPIFY_CONFIG.domain}/api/2024-10/graphql.json`;

async function shopifyFetch(query, variables = {}) {
    const response = await fetch(STOREFRONT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontToken
        },
        body: JSON.stringify({ query, variables })
    });
    return response.json();
}

async function getVariantIdByHandle(handle) {
    const query = `
        query getProduct($handle: String!) {
            product(handle: $handle) {
                variants(first: 1) {
                    edges {
                        node {
                            id
                            price {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        }
    `;
    
    const data = await shopifyFetch(query, { handle });
    const variant = data?.data?.product?.variants?.edges?.[0]?.node;
    return variant?.id || null;
}

// ============================================
// CARRELLO - API + Fallback
// ============================================
async function getCart() {
    if (apiAvailable) {
        const cart = await apiCall('/cart');
        if (cart && !cart.error) {
            return cart;
        }
    }
    return getLocalCart();
}

async function addToCartAPI(productHandle, quantity) {
    // 1. Recupera variant ID da Shopify
    const variantId = await getVariantIdByHandle(productHandle);
    if (!variantId) {
        throw new Error('Prodotto non trovato su Shopify');
    }
    
    // 2. Trova info prodotto
    const oknattyProduct = SHOPIFY_CONFIG.productHandles[productHandle];
    const elementProduct = SHOPIFY_CONFIG.elementProducts.find(p => p.handle === productHandle);
    const productInfo = oknattyProduct || elementProduct;
    
    if (!productInfo) {
        throw new Error('Prodotto non configurato');
    }
    
    // 3. Prova API
    if (apiAvailable) {
        const result = await apiCall('/cart', 'POST', {
            handle: productHandle,
            variantId,
            quantity,
            price: productInfo.price,
            title: productInfo.title,
            brand: productInfo.brand
        });
        
        if (result && !result.error) {
            updateCartBadge();
            return result;
        }
    }
    
    // 4. Fallback localStorage
    let cart = getLocalCart();
    const existingIndex = cart.items.findIndex(item => item.handle === productHandle);
    
    if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += quantity;
    } else {
        cart.items.push({
            handle: productHandle,
            variantId,
            quantity,
            price: productInfo.price,
            title: productInfo.title,
            brand: productInfo.brand
        });
    }
    
    saveLocalCart(cart);
    return cart;
}

async function updateCartItemAPI(handle, delta) {
    const cart = await getCart();
    const item = cart.items.find(i => i.handle === handle);
    if (!item) return cart;
    
    const newQuantity = item.quantity + delta;
    
    if (apiAvailable) {
        if (newQuantity <= 0) {
            const result = await apiCall('/cart/item', 'DELETE', { handle });
            if (result && !result.error) {
                updateCartBadge();
                return result;
            }
        } else {
            const result = await apiCall('/cart/item', 'PUT', { handle, quantity: newQuantity });
            if (result && !result.error) {
                updateCartBadge();
                return result;
            }
        }
    }
    
    // Fallback
    if (newQuantity <= 0) {
        cart.items = cart.items.filter(i => i.handle !== handle);
    } else {
        item.quantity = newQuantity;
    }
    
    saveLocalCart(cart);
    return cart;
}

async function clearCartAPI() {
    if (apiAvailable) {
        const result = await apiCall('/cart/clear', 'POST');
        if (result && !result.error) {
            updateCartBadge();
            return result;
        }
    }
    
    localStorage.removeItem(LOCAL_CART_KEY);
    updateCartBadge();
    return { items: [] };
}

async function createCheckoutAPI() {
    const cart = await getCart();
    
    if (apiAvailable) {
        const result = await apiCall('/cart/checkout', 'POST');
        if (result && !result.error && result.checkoutUrl) {
            return result.checkoutUrl;
        }
    }
    
    // Fallback: crea checkout Shopify diretto
    if (cart.items.length === 0) return null;
    
    const lineItems = cart.items.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity
    }));
    
    const query = `
        mutation cartCreate($input: CartInput!) {
            cartCreate(input: $input) {
                cart {
                    id
                    checkoutUrl
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;
    
    const data = await shopifyFetch(query, {
        input: { lines: lineItems }
    });
    
    if (data?.data?.cartCreate?.userErrors?.length > 0) {
        console.error('Shopify errors:', data.data.cartCreate.userErrors);
        return null;
    }
    
    return data?.data?.cartCreate?.cart?.checkoutUrl || null;
}

// ============================================
// BADGE CARRELLO
// ============================================
function updateCartBadge() {
    getCart().then(cart => {
        const totalItems = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        
        let badge = document.querySelector('.cart-badge');
        if (!badge) {
            const nav = document.querySelector('.nav-links');
            if (nav) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="#" class="cart-link" onclick="openCartDrawer(event)" title="Carrello">
                        🛒 <span class="cart-badge">0</span>
                    </a>
                `;
                nav.appendChild(li);
                badge = li.querySelector('.cart-badge');
            }
        }
        
        if (badge) {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
        }
    });
}

// ============================================
// ADD TO CART - Funzione principale
// ============================================
async function addToCart(productHandle, quantity) {
    const btn = event?.target;
    if (btn) {
        btn.style.opacity = '0.7';
        btn.textContent = 'Aggiungendo...';
    }
    
    try {
        await addToCartAPI(productHandle, quantity);
        
        const addedProduct = SHOPIFY_CONFIG.productHandles[productHandle] || 
                            SHOPIFY_CONFIG.elementProducts.find(p => p.handle === productHandle);
        const addedName = addedProduct?.title || 'Prodotto';
        
        showNotification(`✅ ${addedName} aggiunto! Clicca 🛒 per vedere il carrello`);
        
    } catch (err) {
        console.error('Errore addToCart:', err);
        showNotification('❌ Errore: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.style.opacity = '1';
            btn.textContent = 'Acquista Ora 🛒';
        }
    }
}

// ============================================
// CARRELLO DRAWER
// ============================================
async function openCartDrawer(e) {
    if (e) e.preventDefault();
    
    const existing = document.querySelector('.cart-drawer');
    if (existing) existing.remove();
    
    const cart = await getCart();
    const totalItems = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const totalPrice = cart.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    
    const shuffled = [...SHOPIFY_CONFIG.elementProducts].sort(() => 0.5 - Math.random());
    const suggested = shuffled.slice(0, 3);
    
    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
        <div class="cart-drawer-overlay" onclick="closeCartDrawer()"></div>
        <div class="cart-drawer-panel">
            <div class="cart-drawer-header">
                <h3>🛒 Il tuo carrello</h3>
                <button class="cart-drawer-close" onclick="closeCartDrawer()">✕</button>
            </div>
            <div class="cart-drawer-body">
                ${totalItems === 0 ? `
                    <div class="cart-empty">
                        <p>Il carrello è vuoto</p>
                        <a href="../index.html#prodotti" class="btn-primary" onclick="closeCartDrawer()">Scopri i prodotti</a>
                    </div>
                ` : cart.items.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <span class="cart-item-name">${item.title || item.handle.replace(/-/g, ' ')}</span>
                            <span class="cart-item-brand">${item.brand || 'OKNATTY'}</span>
                            <span class="cart-item-price">€${item.price.toFixed(2)}</span>
                        </div>
                        <div class="cart-item-qty">
                            <button onclick="updateCartItem('${item.handle}', -1)">−</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartItem('${item.handle}', 1)">+</button>
                        </div>
                    </div>
                `).join('')}
                
                ${totalItems > 0 ? `
                    <div class="cart-suggestions">
                        <h4>🌟 Completa il tuo ordine</h4>
                        <p class="cart-suggestions-sub">Integratori ELEMENT per il tuo training</p>
                        ${suggested.map(prod => `
                            <div class="cart-suggestion-item" onclick="addToCart('${prod.handle}', 1)">
                                <div class="cart-suggestion-info">
                                    <span class="cart-suggestion-name">${prod.title}</span>
                                    <span class="cart-suggestion-sub">${prod.subtitle}</span>
                                </div>
                                <div class="cart-suggestion-price-add">
                                    <span class="cart-suggestion-price">€${prod.price.toFixed(2)}</span>
                                    <button class="cart-suggestion-add">+</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            ${totalItems > 0 ? `
                <div class="cart-drawer-footer">
                    <div class="cart-total">
                        <span>Totale (${totalItems} ${totalItems === 1 ? 'articolo' : 'articoli'})</span>
                        <span>€${totalPrice.toFixed(2)}</span>
                    </div>
                    <button class="btn-checkout" onclick="goToCheckout()">
                        Vai al Checkout →
                    </button>
                    <button class="btn-continue" onclick="closeCartDrawer()">← Continua a navigare</button>
                    <button class="btn-clear" onclick="clearCart(); closeCartDrawer();">Svuota carrello</button>
                </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(drawer);
    document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
    const drawer = document.querySelector('.cart-drawer');
    if (drawer) drawer.remove();
    document.body.style.overflow = '';
}

async function updateCartItem(handle, delta) {
    await updateCartItemAPI(handle, delta);
    openCartDrawer();
}

async function clearCart() {
    await clearCartAPI();
}

async function goToCheckout() {
    const btn = document.querySelector('.btn-checkout');
    if (btn) {
        btn.textContent = 'Creando checkout...';
        btn.style.opacity = '0.7';
    }
    
    try {
        const checkoutUrl = await createCheckoutAPI();
        if (checkoutUrl) {
            window.open(checkoutUrl, '_blank');
            closeCartDrawer();
        } else {
            showNotification('❌ Errore nel creare il checkout', 'error');
        }
    } catch (err) {
        console.error('Checkout error:', err);
        showNotification('❌ Errore checkout: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.textContent = 'Vai al Checkout →';
            btn.style.opacity = '1';
        }
    }
}

// ============================================
// NOTIFICHE
// ============================================
function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `cart-notification ${type}`;
    notif.textContent = message;
    notif.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--green, #6B8E4E)' : '#c0392b'};
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        font-family: 'Fredoka', sans-serif;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ============================================
// STILI CSS
// ============================================
function injectCartStyles() {
    if (document.getElementById('cart-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'cart-styles';
    style.textContent = `
        .cart-link {
            position: relative !important;
            text-decoration: none;
            font-size: 1.2rem;
            display: inline-block;
        }
        .cart-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: var(--brown, #5C3D2E);
            color: white;
            font-size: 0.7rem;
            font-weight: 700;
            min-width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Fredoka', sans-serif;
            padding: 0 4px;
            line-height: 1;
            text-align: center;
        }
        .cart-drawer {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 10000;
            display: flex;
            justify-content: flex-end;
        }
        .cart-drawer-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4);
        }
        .cart-drawer-panel {
            position: relative;
            width: 400px;
            max-width: 90vw;
            height: 100%;
            background: var(--white, #FFFDF7);
            background-image: url('white-paper-texture.webp');
            background-repeat: repeat;
            background-size: 500px;
            display: flex;
            flex-direction: column;
            animation: slideInRight 0.3s ease;
            box-shadow: -8px 0 30px rgba(0,0,0,0.2);
        }
        .cart-drawer-header {
            padding: 24px;
            border-bottom: 2px solid var(--cream, #F5E6C8);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .cart-drawer-header h3 {
            font-family: 'Fredoka', sans-serif;
            font-size: 1.4rem;
            color: var(--dark-brown, #3D2618);
            margin: 0;
        }
        .cart-drawer-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--brown, #5C3D2E);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .cart-drawer-close:hover {
            background: var(--cream, #F5E6C8);
        }
        .cart-drawer-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .cart-empty {
            text-align: center;
            padding: 40px 20px;
        }
        .cart-empty p {
            font-size: 1.1rem;
            color: var(--brown, #5C3D2E);
            margin-bottom: 20px;
        }
        .cart-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: rgba(255,253,247,0.8);
            border: 2px solid var(--cream, #F5E6C8);
            border-radius: 16px;
            margin-bottom: 12px;
        }
        .cart-item-name {
            font-family: 'Fredoka', sans-serif;
            font-weight: 600;
            color: var(--dark-brown, #3D2618);
            text-transform: capitalize;
        }
        .cart-item-brand {
            display: block;
            font-size: 0.7rem;
            color: var(--brown, #5C3D2E);
            opacity: 0.6;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
        }
        .cart-item-price {
            display: block;
            color: var(--brown, #5C3D2E);
            font-weight: 700;
            margin-top: 4px;
        }
        .cart-item-qty {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .cart-item-qty button {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid var(--brown, #5C3D2E);
            background: white;
            cursor: pointer;
            font-weight: 700;
            transition: all 0.2s;
        }
        .cart-item-qty button:hover {
            background: var(--brown, #5C3D2E);
            color: white;
        }
        .cart-item-qty span {
            font-weight: 700;
            min-width: 24px;
            text-align: center;
        }
        .cart-drawer-footer {
            padding: 24px;
            border-top: 2px solid var(--cream, #F5E6C8);
            background: rgba(245,230,200,0.3);
        }
        .cart-total {
            display: flex;
            justify-content: space-between;
            font-family: 'Fredoka', sans-serif;
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--dark-brown, #3D2618);
            margin-bottom: 16px;
        }
        .btn-checkout {
            display: block;
            width: 100%;
            background: var(--brown, #5C3D2E);
            color: white;
            text-align: center;
            padding: 16px;
            border-radius: 50px;
            text-decoration: none;
            font-family: 'Fredoka', sans-serif;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s;
            margin-bottom: 12px;
            border: none;
            cursor: pointer;
        }
        .btn-checkout:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(92,61,46,0.3);
        }
        .btn-continue {
            display: block;
            width: 100%;
            background: var(--cream, #F5E6C8);
            color: var(--dark-brown, #3D2618);
            border: 2px solid var(--cream, #F5E6C8);
            padding: 12px;
            border-radius: 50px;
            cursor: pointer;
            font-family: 'Fredoka', sans-serif;
            font-weight: 600;
            transition: all 0.3s;
            margin-bottom: 12px;
        }
        .btn-continue:hover {
            background: var(--dark-brown, #3D2618);
            color: white;
        }
        .btn-clear {
            display: block;
            width: 100%;
            background: transparent;
            color: var(--brown, #5C3D2E);
            border: 2px solid var(--brown, #5C3D2E);
            padding: 12px;
            border-radius: 50px;
            cursor: pointer;
            font-family: 'Fredoka', sans-serif;
            font-weight: 600;
            transition: all 0.3s;
        }
        .btn-clear:hover {
            background: var(--brown, #5C3D2E);
            color: white;
        }
        .cart-suggestions {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 2px dashed var(--cream, #F5E6C8);
        }
        .cart-suggestions h4 {
            font-family: 'Fredoka', sans-serif;
            font-size: 1.1rem;
            color: var(--dark-brown, #3D2618);
            margin: 0 0 4px 0;
        }
        .cart-suggestions-sub {
            font-size: 0.85rem;
            color: var(--brown, #5C3D2E);
            margin: 0 0 16px 0;
            opacity: 0.8;
        }
        .cart-suggestion-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 16px;
            background: rgba(92, 61, 46, 0.05);
            border: 2px solid var(--cream, #F5E6C8);
            border-radius: 16px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .cart-suggestion-item:hover {
            background: rgba(92, 61, 46, 0.1);
            border-color: var(--brown, #5C3D2E);
            transform: translateX(4px);
        }
        .cart-suggestion-name {
            font-family: 'Fredoka', sans-serif;
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--dark-brown, #3D2618);
            display: block;
        }
        .cart-suggestion-sub {
            font-size: 0.75rem;
            color: var(--brown, #5C3D2E);
            opacity: 0.7;
            display: block;
            margin-top: 2px;
        }
        .cart-suggestion-price-add {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .cart-suggestion-price {
            font-weight: 700;
            color: var(--dark-brown, #3D2618);
            font-size: 0.95rem;
        }
        .cart-suggestion-add {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid var(--brown, #5C3D2E);
            background: white;
            cursor: pointer;
            font-weight: 700;
            font-size: 1.2rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .cart-suggestion-add:hover {
            background: var(--brown, #5C3D2E);
            color: white;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @media (max-width: 768px) {
            .cart-drawer-panel {
                width: 100%;
                max-width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// INIZIALIZZAZIONE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    injectCartStyles();
    updateCartBadge();
});

// Esponi funzioni globali
window.addToCart = addToCart;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.updateCartItem = updateCartItem;
window.clearCart = clearCart;
window.goToCheckout = goToCheckout;
