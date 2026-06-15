// OKNATTY Shopify Storefront API Integration
// Configurazione: inserisci qui i tuoi dati Shopify
const SHOPIFY_CONFIG = {
    domain: 'bu4ksb-yb.myshopify.com',  // Solo dominio, SENZA https://
    storefrontToken: '5d852e4156a7c1c496174a37a01e6356', // Token dal canale Headless
    // Mappa handle Shopify → pagine prodotto OKNATTY
    // Gli handle sono gli slug dei prodotti su Shopify (ultima parte dell'URL)
    productHandles: {
        'cioccolato-fondente': { handle: 'cioccolato-fondente', price: 9.90 },
        'cioccolato-cocco': { handle: 'cioccolato-cocco', price: 9.90 },
        'caramello-salato': { handle: 'caramello-salato', price: 9.90 },
        'crema-nocciola-bianca': { handle: 'crema-nocciola-bianca', price: 9.90 },
        'cacao-nocciola': { handle: 'cacao-nocciola', price: 9.90 },
        'crema-cocco-bar': { handle: 'crema-cocco-bar', price: 9.90 },
        'burro-arachidi': { handle: 'burro-arachidi', price: 8.90 },
        'crema-di-riso': { handle: 'crema-di-riso', price: 13.90 }
    }
};

// GraphQL endpoint Storefront API
const STOREFRAPHQL_URL = `https://${SHOPIFY_CONFIG.domain.replace(/^https?:\/\//, '')}/api/2024-10/graphql.json`;

// ============================================
// CARRELLO - localStorage
// ============================================
const CART_KEY = 'oknatty_cart';

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || { items: [], checkoutUrl: null };
    } catch {
        return { items: [], checkoutUrl: null };
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
}

// ============================================
// BADGE CARRELLO
// ============================================
function updateCartBadge() {
    const cart = getCart();
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Cerca o crea il badge nella navbar
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
}

// ============================================
// SHOPIFY STOREFRONT API - GraphQL
// ============================================
async function shopifyFetch(query, variables = {}) {
    const response = await fetch(STOREFRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontToken
        },
        body: JSON.stringify({ query, variables })
    });
    return response.json();
}

// Recupera variant ID di un prodotto dallo handle
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

// Crea un carrello Shopify con i prodotti
async function createShopifyCart(items) {
    // items = [{ variantId, quantity }]
    const lines = items.map(item => ({
        merchandiseId: item.variantId,
        quantity: item.quantity
    }));
    
    const query = `
        mutation cartCreate($input: CartInput!) {
            cartCreate(input: $input) {
                cart {
                    id
                    checkoutUrl
                    lines(first: 10) {
                        edges {
                            node {
                                quantity
                                merchandise {
                                    ... on ProductVariant {
                                        title
                                        product {
                                            title
                                        }
                                    }
                                }
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
    
    const data = await shopifyFetch(query, { 
        input: { lines } 
    });
    
    const cart = data?.data?.cartCreate?.cart;
    const errors = data?.data?.cartCreate?.userErrors;
    
    if (errors && errors.length > 0) {
        console.error('Cart errors:', errors);
        throw new Error(errors[0].message);
    }
    
    return {
        id: cart.id,
        checkoutUrl: cart.checkoutUrl,
        items: cart.lines.edges.map(e => e.node)
    };
}

// ============================================
// AGGIUNGI AL CARRELLO
// ============================================
async function addToCart(productHandle, quantity = 1) {
    // Mostra loading
    const btn = event?.target || document.querySelector('.product-cta');
    if (btn) {
        btn.style.opacity = '0.7';
        btn.textContent = 'Aggiungendo...';
    }
    
    try {
        // 1. Recupera variant ID da Shopify
        const variantId = await getVariantIdByHandle(productHandle);
        
        if (!variantId) {
            throw new Error('Prodotto non trovato su Shopify');
        }
        
        // 2. Recupera carrello locale
        let cart = getCart();
        
        // 3. Aggiungi/aggiorna item
        const existingIndex = cart.items.findIndex(item => item.handle === productHandle);
        if (existingIndex >= 0) {
            cart.items[existingIndex].quantity += quantity;
        } else {
            cart.items.push({
                handle: productHandle,
                variantId: variantId,
                quantity: quantity,
                ...SHOPIFY_CONFIG.productHandles[productHandle]
            });
        }
        
        // 4. Crea/aggiorna carrello Shopify
        const shopifyCart = await createShopifyCart(cart.items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
        })));
        
        // 5. Salva checkout URL
        cart.checkoutUrl = shopifyCart.checkoutUrl;
        cart.id = shopifyCart.id;
        saveCart(cart);
        
        // 6. Feedback utente
        showNotification(`✅ Aggiunto al carrello!`);
        
        // 7. Apri drawer carrello
        openCartDrawer();
        
    } catch (err) {
        console.error('Errore addToCart:', err);
        showNotification('❌ Errore: ' + err.message, 'error');
        
        // Fallback: redirect diretto al prodotto Shopify
        const cleanDomain = SHOPIFY_CONFIG.domain.replace(/^https?:\/\//, '');
        const shopifyUrl = `https://${cleanDomain}/products/${productHandle}`;
        // window.location.href = shopifyUrl;
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
function openCartDrawer(e) {
    if (e) e.preventDefault();
    
    // Rimuovi drawer esistente
    const existing = document.querySelector('.cart-drawer');
    if (existing) existing.remove();
    
    const cart = getCart();
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
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
                            <span class="cart-item-name">${item.handle.replace(/-/g, ' ')}</span>
                            <span class="cart-item-price">€${item.price.toFixed(2)}</span>
                        </div>
                        <div class="cart-item-qty">
                            <button onclick="updateCartItem('${item.handle}', -1)">−</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartItem('${item.handle}', 1)">+</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${totalItems > 0 ? `
                <div class="cart-drawer-footer">
                    <div class="cart-total">
                        <span>Totale</span>
                        <span>€${totalPrice.toFixed(2)}</span>
                    </div>
                    <a href="${cart.checkoutUrl || '#'}" class="btn-checkout" target="_blank">
                        Vai al Checkout →
                    </a>
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
    let cart = getCart();
    const item = cart.items.find(i => i.handle === handle);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
        cart.items = cart.items.filter(i => i.handle !== handle);
    }
    
    if (cart.items.length === 0) {
        clearCart();
        closeCartDrawer();
        return;
    }
    
    // Ricrea carrello Shopify
    try {
        const shopifyCart = await createShopifyCart(cart.items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
        })));
        cart.checkoutUrl = shopifyCart.checkoutUrl;
        cart.id = shopifyCart.id;
        saveCart(cart);
        openCartDrawer();
    } catch (err) {
        console.error('Errore update cart:', err);
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
// STILI CSS DINAMICI
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
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Fredoka', sans-serif;
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
            background-image: url('white-paper-texture.jpg');
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
        }
        .btn-checkout:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(92,61,46,0.3);
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
