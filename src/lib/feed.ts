import type { BlogPage, Category, Product } from "./catalog";

export function absoluteUrl(baseUrl: string, path: string) {
	return new URL(path.replace(/^\/+/, ""), `${baseUrl.replace(/\/$/, "")}/`).toString();
}

export function productToFeed(product: Product, baseUrl: string) {
	return {
		...product,
		image: absoluteUrl(baseUrl, product.image),
		url: absoluteUrl(baseUrl, product.url),
		color: {
			...product.color,
			image: absoluteUrl(baseUrl, product.color.image),
		},
	};
}

export function categoryToFeed(category: Category, baseUrl: string) {
	return {
		...category,
		url: absoluteUrl(baseUrl, category.url),
		image: absoluteUrl(baseUrl, category.image),
	};
}

export function pageToFeed(page: BlogPage, baseUrl: string) {
	return {
		...page,
		url: absoluteUrl(baseUrl, page.url),
		image: absoluteUrl(baseUrl, page.image),
	};
}

export function configuredSiteUrl(fallback: string) {
	const configured = import.meta.env.PUBLIC_SITE_URL as string | undefined;
	return (configured || fallback).replace(/\/$/, "");
}

export function jsonResponse(data: unknown) {
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=0, must-revalidate",
		},
	});
}
