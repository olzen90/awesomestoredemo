import { mkdir, readFile, writeFile } from "node:fs/promises";

// GitHub Pages resolves /api/v1/products/ to index.html. Keep the body raw
// JSON, without an HTML wrapper; integrations must parse it as JSON explicitly.
const resources = ["products", "categories", "orders", "pages", "customers"];
for (const resource of resources) {
	const feed = new URL(`../dist/feeds/${resource}.json`, import.meta.url);
	const body = await readFile(feed, "utf8");
	if (!Array.isArray(JSON.parse(body))) throw new Error(`Expected an array for ${resource}`);
	const directory = new URL(`../dist/api/v1/${resource}/`, import.meta.url);
	await mkdir(directory, { recursive: true });
	await writeFile(new URL("index.html", directory), body);
}
console.log(`Generated ${resources.length} resource-style demo API endpoints.`);
