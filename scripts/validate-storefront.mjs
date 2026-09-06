import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = path.join(root, "dist");
const publicDir = path.join(root, "public");
const errors = [];

function readJson(relativePath) {
	const filePath = path.join(dist, relativePath);
	if (!fs.existsSync(filePath)) {
		errors.push(`Missing build output: ${relativePath}`);
		return null;
	}
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch (error) {
		errors.push(`Invalid JSON in ${relativePath}: ${error.message}`);
		return null;
	}
}

function collectHtmlFiles(directory) {
	if (!fs.existsSync(directory)) return [];
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = path.join(directory, entry.name);
		return entry.isDirectory() ? collectHtmlFiles(entryPath) : entry.name.endsWith(".html") ? [entryPath] : [];
	});
}

const products = readJson("feeds/products.json");
const categories = readJson("feeds/categories.json");
const pages = readJson("feeds/pages.json");
const combined = readJson("feeds/clerk.json");
const requiredProductFields = ["id", "name", "description", "price", "image", "url", "categories", "created_at"];
const validKey = /^[A-Za-z0-9_]+$/;

if (products && products.length !== 200) errors.push(`Expected 200 products, found ${products.length}`);
if (products) {
	const ids = new Set();
	const urls = new Set();
	for (const product of products) {
		for (const field of requiredProductFields) if (!(field in product)) errors.push(`Product ${product.id ?? "unknown"} is missing ${field}`);
		if (ids.has(product.id)) errors.push(`Duplicate product ID: ${product.id}`);
		ids.add(product.id);
		if (urls.has(product.url)) errors.push(`Duplicate product URL: ${product.url}`);
		urls.add(product.url);
		if (typeof product.id !== "number") errors.push(`Product ${product.id} does not use an integer ID`);
		if (!Array.isArray(product.categories) || product.categories.length === 0) errors.push(`Product ${product.id} has no categories`);
		if (product.price < 0 || product.list_price < 0) errors.push(`Product ${product.id} has a negative price`);
		if (!Number.isInteger(product.created_at)) errors.push(`Product ${product.id} has an invalid created_at timestamp`);
		if (Object.keys(product).some((key) => !validKey.test(key))) errors.push(`Product ${product.id} contains an invalid attribute name`);
		for (const [key, value] of Object.entries(product)) if (value === null) errors.push(`Product ${product.id} has null attribute ${key}`);
		try {
			const imagePath = new URL(product.image).pathname;
			if (!fs.existsSync(path.join(publicDir, imagePath.replace(/^\//, "")))) errors.push(`Missing image for product ${product.id}: ${imagePath}`);
		} catch {
			errors.push(`Product ${product.id} has an invalid image URL`);
		}
	}
}

if (categories && categories.length !== 26) errors.push(`Expected 26 categories, found ${categories.length}`);
if (categories) {
	const categoryIds = new Set(categories.map((category) => category.id));
	for (const category of categories) for (const childId of category.subcategories || []) if (!categoryIds.has(childId)) errors.push(`Category ${category.id} references missing child ${childId}`);
	for (const product of products || []) for (const categoryId of product.categories || []) if (!categoryIds.has(categoryId)) errors.push(`Product ${product.id} references missing category ${categoryId}`);
}

if (pages && pages.length !== 3) errors.push(`Expected 3 blog pages, found ${pages.length}`);
if (combined) {
	if (combined.products?.length !== 200) errors.push("Combined feed does not contain 200 products");
	if (combined.config?.strict !== false) errors.push("Combined feed config.strict must be false");
	if (!Number.isInteger(combined.config?.created)) errors.push("Combined feed config.created must be a Unix timestamp");
}

const routeCounts = {
	product: collectHtmlFiles(path.join(dist, "product")).length,
	category: collectHtmlFiles(path.join(dist, "category")).length,
	blog: collectHtmlFiles(path.join(dist, "blog")).length,
};
if (routeCounts.product !== 200) errors.push(`Expected 200 product routes, found ${routeCounts.product}`);
if (routeCounts.category !== 26) errors.push(`Expected 26 category routes, found ${routeCounts.category}`);
if (routeCounts.blog !== 4) errors.push(`Expected 4 blog routes, found ${routeCounts.blog}`);

if (errors.length) {
	console.error(`Awesome Store validation failed with ${errors.length} issue(s):`);
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log("Awesome Store validation passed: 200 products, 26 categories, 3 blog pages, all feeds, routes, and images verified.");
