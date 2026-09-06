import type { APIRoute } from "astro";
import { blogPages } from "../../lib/catalog";
import { configuredSiteUrl, jsonResponse, pageToFeed } from "../../lib/feed";

export const GET = (({ request }) => {
	const baseUrl = configuredSiteUrl(new URL(request.url).origin);
	return jsonResponse(blogPages.map((page) => pageToFeed(page, baseUrl)));
}) satisfies APIRoute;
