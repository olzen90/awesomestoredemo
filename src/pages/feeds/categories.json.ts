import type { APIRoute } from "astro";
import { categories } from "../../lib/catalog";
import { categoryToFeed, configuredSiteUrl, jsonResponse } from "../../lib/feed";

export const GET = (({ request }) => {
	const baseUrl = configuredSiteUrl(new URL(request.url).origin);
	return jsonResponse(categories.map((category) => categoryToFeed(category, baseUrl)));
}) satisfies APIRoute;
