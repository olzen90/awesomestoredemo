# Awesome Store Clerk Demo

An Astro storefront made for demonstrating Clerk integrations. It is intentionally static: there is no payment flow or connected commerce backend.

## Commands

```sh
npm run dev
npm run build:verify
```

The build emits the Clerk-ready feeds at `/feeds/products.json`, `/feeds/categories.json`, `/feeds/pages.json`, `/feeds/orders.json`, and `/feeds/clerk.json`.

The order feed contains 5,000 deterministic sample orders drawn from the current product catalog. Orders include realistic single-product and complementary multi-product baskets, fictional pop-culture customer emails, and Clerk-compatible parcel tracking data. Rebuilding the site regenerates the feed from the current catalog.

Each product includes the existing structured `color` attribute plus a deterministic `margin_group` integer from 1 (lowest margin) to 5 (highest margin), which can be used for merchandising demonstrations.

## Clerk.js and injection context

The shared layout adds the Clerk.js loader immediately before the closing `</head>` tag. It uses `PUBLIC_CLERK_API_KEY` when provided and falls back to the demo publishable key used for this example.

The pages include simple, neutral context markers that represent ordinary webshop HTML. They are intentionally not named after any integration:

```js
document.querySelector("[data-category-id]")?.dataset.categoryId;
document.querySelector("[data-product-id]")?.dataset.productId;
document.querySelector("[data-page-id]")?.dataset.pageId;
document.querySelector("[data-cart-product-ids]")?.dataset.cartProductIds;
```

The cart marker is updated whenever the local cart changes. It exposes comma-separated product IDs in `data-cart-product-ids` and the current `{ id, quantity, price }` lines as JSON in `data-cart-items`.

## Optional Clerk configuration

Copy `.env.example` to `.env` and set `PUBLIC_CLERK_API_KEY` to enable Clerk.js in the browser. Set `PUBLIC_SITE_URL` to the deployed site origin when the feeds need to be imported from a hosted URL.
