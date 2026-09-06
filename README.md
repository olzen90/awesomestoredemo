# Awesome Store Clerk Demo

An Astro storefront made for demonstrating Clerk integrations. It is intentionally static: there is no payment flow or connected commerce backend.

## Commands

```sh
npm run dev
npm run build:verify
```

The build emits the Clerk-ready feeds at `/feeds/products.json`, `/feeds/categories.json`, `/feeds/pages.json`, and `/feeds/clerk.json`.

## Optional Clerk configuration

Copy `.env.example` to `.env` and set `PUBLIC_CLERK_API_KEY` to enable Clerk.js in the browser. Set `PUBLIC_SITE_URL` to the deployed site origin when the feeds need to be imported from a hosted URL.
