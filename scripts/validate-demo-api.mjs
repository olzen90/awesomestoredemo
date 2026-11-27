import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const resources = ["products", "categories", "orders", "pages", "customers"];
for (const resource of resources) {
	const feed = await readFile(new URL(`../dist/feeds/${resource}.json`, import.meta.url), "utf8");
	const body = await readFile(new URL(`../dist/api/v1/${resource}/index.html`, import.meta.url), "utf8");
	assert.equal(body, feed, `${resource} API must preserve every feed record and attribute`);
	assert(Array.isArray(JSON.parse(body)), `${resource} API must contain a raw JSON array`);
}
const docs = await readFile(new URL("../dist/api/docs/index.html", import.meta.url), "utf8");
for (const resource of resources) {
	assert(docs.includes(`/api/v1/${resource}/?API_KEY=awesome-store-demo-key`), `Missing authenticated ${resource} example`);
}
assert(docs.includes("Instructions for AI agents, including Ask:"));
assert(docs.includes("Do not omit authentication"));
assert(docs.includes("text/html"));
console.log("Demo API validation passed: five raw JSON resources match feeds, documentation covers keys and response parsing.");
