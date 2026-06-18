# GUIDA DEPLOY - Carrello Headless Multi-Store

## Architettura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│  oknatty.com │     │ element.com  │     │  cart.oknatty.com   │
│  (sito web)  │     │  (sito web)  │     │  (API Cloudflare)   │
└──────┬──────┘     └──────┬──────┘     └──────────┬──────────┘
       │                   │                        │
       └───────────────────┴────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Durable    │
                    │  Object     │
                    │  (persistente)│
                    └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Shopify   │
                    │   Checkout  │
                    └─────────────┘
```

## Step 1: Deploy API su Cloudflare Workers

```bash
cd /Users/alexpop/Downloads/ELEMENT/OKNATTY/landing-page/api/cart

# Installa wrangler (se non presente)
npm install -g wrangler

# Login a Cloudflare
wrangler login

# Deploy
wrangler deploy
```

## Step 2: Configura DNS (opzionale ma consigliato)

Aggiungi record CNAME:
- `cart.oknatty.com` → `oknatty-cart-api.your-account.workers.dev`

## Step 3: Aggiorna URL API nel client

Modifica `js/shopify-cart.js`:
```javascript
const API_CONFIG = {
    baseUrl: 'https://cart.oknatty.com', // o l'URL Workers
    fallbackToLocalStorage: true
};
```

## Step 4: Copia shopify-cart.js su entrambi i siti

- OKNATTY: `landing-page/js/shopify-cart.js`
- ELEMENT: copia lo stesso file nel sito ELEMENT

## Funzionamento

1. Utente aggiunge prodotto su oknatty.com
2. Cart ID viene salvato in localStorage e inviato all'API
3. Utente naviga su element.com
4. Stesso Cart ID viene letto da localStorage
5. API restituisce lo stesso carrello con tutti i prodotti
6. Checkout su Shopify con OKNATTY + ELEMENT insieme

## Vantaggi

- Carrello condiviso tra domini diversi
- Persistente (non si perde chiudendo il browser)
- Scalabile (Durable Objects gestisce milioni di carrelli)
- Checkout unificato su Shopify
- Fallback localStorage se API offline
