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
assert(docs.includes("data-python-helper"), "Documentation must provide a Python helper");
assert(!docs.includes("async function fetchShopData"), "Remove the obsolete JavaScript example");
const decodeHtml = (value) => value.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[entity]);
const examples = [...docs.matchAll(/<code\b[^>]*data-response-example="([^"]+)"[^>]*>([\s\S]*?)<\/code>/g)];
assert.equal(examples.length, resources.length, "Each resource needs a JSON response example");
for (const [, resource, encoded] of examples) {
	assert(resources.includes(resource));
	const example = JSON.parse(decodeHtml(encoded));
	const actual = JSON.parse(await readFile(new URL(`../dist/feeds/${resource}.json`, import.meta.url), "utf8"))[0];
	assert.equal(example.length, 1);
	assert.deepEqual(Object.keys(example[0]), Object.keys(actual), `${resource} example must show every response field`);
	assert.equal(example[0].id, actual.id, `${resource} example must use a real record`);
}
console.log("Demo API validation passed: five raw JSON resources match feeds; Python documentation and response examples verified.");
