import type { APIRoute } from "astro";
import { products } from "../../lib/catalog";
import { configuredSiteUrl, jsonResponse, productToFeed } from "../../lib/feed";

export const GET = (({ request }) => {
	const baseUrl = configuredSiteUrl(new URL(request.url).origin);
	return jsonResponse(products.map((product) => productToFeed(product, baseUrl)));
}) satisfies APIRoute;
