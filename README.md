# Awesome Store Clerk Demo

An Astro storefront made for demonstrating Clerk integrations. It is intentionally static: there is no payment flow or connected commerce backend.

## Commands

```sh
npm run dev
npm run build:verify
```

The build emits the Clerk-ready feeds at `/feeds/products.json`, `/feeds/categories.json`, `/feeds/pages.json`, `/feeds/orders.json`, and `/feeds/clerk.json`.

The order feed contains 10,000 deterministic sample orders drawn from the current product catalog. Orders include realistic single-product and complementary multi-product baskets, fictional pop-culture customer emails, and Clerk-compatible parcel tracking data. The generated history intentionally covers roughly 70% of the catalog so some products remain unseen for merchandising demonstrations. The existing history is frozen in `src/data/orders-archive.json`, so adding products later only appends new orders; it does not rewrite existing order records.

The catalog currently contains 512 products distributed across all existing leaf categories. Product IDs and image filenames remain stable across builds and catalog growth. New product records are appended after the current ID watermark (`10512`), and each new product receives eight deterministic orders in the generated feed. Existing order data is always emitted first and is checked against the archive during validation.

Each product includes the existing structured `color` attribute plus a deterministic `margin_group` integer from 1 (lowest margin) to 5 (highest margin), which can be used for merchandising demonstrations.

In the Clerk feeds, `color` is normalized to a list of simple color names, such as `["Sage"]`. The storefront keeps the richer color metadata internally for displaying swatches and product imagery.

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

## GitHub Pages

The repository includes a GitHub Actions workflow for GitHub Pages. It deploys `main` to [https://olzen90.github.io/awesomestoredemo/](https://olzen90.github.io/awesomestoredemo/) and builds the feeds with the correct project path. In the repository settings, set Pages → Build and deployment → Source to GitHub Actions.

The workflow sets `PUBLIC_SITE_URL` to the deployed site URL and `PUBLIC_BASE_PATH` to `/awesomestoredemo`. Local development keeps the default root path, so `npm run dev` continues to use `http://localhost:4321/`.
