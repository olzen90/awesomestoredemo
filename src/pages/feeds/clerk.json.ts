import type { APIRoute } from "astro";
import { blogPages, categories, products } from "../../lib/catalog";
import { categoryToFeed, configuredSiteUrl, jsonResponse, pageToFeed, productToFeed } from "../../lib/feed";

export const GET = (({ request }) => {
	const baseUrl = configuredSiteUrl(new URL(request.url).origin);
	return jsonResponse({
		products: products.map((product) => productToFeed(product, baseUrl)),
		categories: categories.map((category) => categoryToFeed(category, baseUrl)),
		pages: blogPages.map((page) => pageToFeed(page, baseUrl)),
		config: { created: Math.floor(Date.now() / 1000), strict: false },
	});
}) satisfies APIRoute;
