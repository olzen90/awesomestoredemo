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
const orders = readJson("feeds/orders.json");
const combined = readJson("feeds/clerk.json");
const requiredProductFields = ["id", "name", "description", "price", "image", "url", "categories", "created_at", "color", "margin_group"];
const requiredOrderFields = ["id", "products", "time", "tracking"];
const validKey = /^[A-Za-z0-9_]+$/;
const validOrderStatuses = new Set(["PROCESSING", "SENT", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION", "RETURNED"]);
const validCarriers = new Set(["GLS", "UPS", "FedEx"]);
const productIds = new Set((products || []).map((product) => product.id));

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
		if (!Array.isArray(product.color) || product.color.length === 0 || product.color.some((color) => typeof color !== "string" || !color.trim())) errors.push(`Product ${product.id} has an invalid color attribute; expected a non-empty list of simple color names`);
		if (!Number.isInteger(product.margin_group) || product.margin_group < 1 || product.margin_group > 5) errors.push(`Product ${product.id} has an invalid margin_group; expected an integer from 1 to 5`);
		if (product.price < 0 || product.list_price < 0) errors.push(`Product ${product.id} has a negative price`);
		if (!Number.isInteger(product.created_at)) errors.push(`Product ${product.id} has an invalid created_at timestamp`);
		if (Object.keys(product).some((key) => !validKey.test(key))) errors.push(`Product ${product.id} contains an invalid attribute name`);
		for (const [key, value] of Object.entries(product)) if (value === null) errors.push(`Product ${product.id} has null attribute ${key}`);
		try {
			const imagePath = new URL(product.image).pathname;
			const publicImagePath = imagePath.match(/(images\/.*)$/)?.[1] || imagePath.replace(/^\//, "");
			if (!fs.existsSync(path.join(publicDir, publicImagePath))) errors.push(`Missing image for product ${product.id}: ${imagePath}`);
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
if (orders && orders.length !== 5_000) errors.push(`Expected 5000 orders, found ${orders.length}`);
if (orders) {
	const orderIds = new Set();
	const trackingCodes = new Set();
	const carriers = new Set();
	const statuses = new Set();
	let singleProductOrders = 0;
	for (const order of orders) {
		for (const field of requiredOrderFields) if (!(field in order)) errors.push(`Order ${order.id ?? "unknown"} is missing ${field}`);
		if (orderIds.has(order.id)) errors.push(`Duplicate order ID: ${order.id}`);
		orderIds.add(order.id);
		if (!Number.isInteger(order.id)) errors.push(`Order ${order.id} does not use an integer ID`);
		if (!Number.isInteger(order.time)) errors.push(`Order ${order.id} has an invalid time`);
		if (!Array.isArray(order.products) || order.products.length === 0) errors.push(`Order ${order.id} has no products`);
		if (order.products?.length === 1) singleProductOrders += 1;
		for (const item of order.products || []) {
			if (!productIds.has(item.id)) errors.push(`Order ${order.id} references missing product ${item.id}`);
			if (!Number.isInteger(item.quantity) || item.quantity < 1) errors.push(`Order ${order.id} has an invalid quantity for product ${item.id}`);
			if (typeof item.price !== "number" || item.price < 0) errors.push(`Order ${order.id} has an invalid price for product ${item.id}`);
		}
		if (!Array.isArray(order.tracking) || order.tracking.length === 0) errors.push(`Order ${order.id} has no tracking parcels`);
		for (const parcel of order.tracking || []) {
			for (const field of ["tracking_link", "tracking_code", "status", "status_text"]) {
				if (!(field in parcel)) errors.push(`Order ${order.id} tracking parcel is missing ${field}`);
			}
			if (!validCarriers.has(parcel.carrier)) errors.push(`Order ${order.id} has an invalid carrier ${parcel.carrier}`);
			if (trackingCodes.has(parcel.tracking_code)) errors.push(`Duplicate tracking code: ${parcel.tracking_code}`);
			trackingCodes.add(parcel.tracking_code);
			carriers.add(parcel.carrier);
			statuses.add(parcel.status);
			if (!validOrderStatuses.has(parcel.status)) errors.push(`Order ${order.id} has an invalid tracking status ${parcel.status}`);
			try {
				const trackingUrl = new URL(parcel.tracking_link);
				if (!trackingUrl.hostname.endsWith(".example")) errors.push(`Order ${order.id} tracking link is not a fake .example URL`);
			} catch {
				errors.push(`Order ${order.id} has an invalid tracking link`);
			}
			if (!Array.isArray(parcel.events) || parcel.events.length === 0) errors.push(`Order ${order.id} tracking parcel has no events`);
		}
	}
	if (singleProductOrders === 0) errors.push("Orders do not contain any single-product purchases");
	if (carriers.size !== 3) errors.push(`Expected all 3 fictional carriers, found ${carriers.size}`);
	if (statuses.size < 5) errors.push(`Expected at least 5 tracking statuses, found ${statuses.size}`);
}
if (combined) {
	if (combined.products?.length !== 200) errors.push("Combined feed does not contain 200 products");
	if (combined.orders?.length !== 5_000) errors.push("Combined feed does not contain 5000 orders");
	if (combined.config?.strict !== false) errors.push("Combined feed config.strict must be false");
	if (!Number.isInteger(combined.config?.created)) errors.push("Combined feed config.created must be a Unix timestamp");
}

const routeCounts = {
	product: collectHtmlFiles(path.join(dist, "product")).length,
	category: collectHtmlFiles(path.join(dist, "category")).length,
	blog: collectHtmlFiles(path.join(dist, "blog")).length,
};
if (!fs.existsSync(path.join(dist, "cart", "index.html"))) errors.push("Missing /cart route");
if (fs.existsSync(path.join(dist, "basket", "index.html"))) errors.push("Legacy /basket route should not be generated");
if (routeCounts.product !== 200) errors.push(`Expected 200 product routes, found ${routeCounts.product}`);
if (routeCounts.category !== 26) errors.push(`Expected 26 category routes, found ${routeCounts.category}`);
if (routeCounts.blog !== 4) errors.push(`Expected 4 blog routes, found ${routeCounts.blog}`);

if (errors.length) {
	console.error(`Awesome Store validation failed with ${errors.length} issue(s):`);
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log("Awesome Store validation passed: 200 products, 26 categories, 3 blog pages, 5000 orders, all feeds, routes, and images verified.");
