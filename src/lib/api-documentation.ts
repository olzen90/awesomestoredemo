import { products, categories, blogPages } from "./catalog";
import { orders } from "./orders";
import { customers } from "./customers";
import { productToFeed, categoryToFeed, pageToFeed } from "./feed";

const descriptions: Record<string, string> = {
	id: "Stable integer record ID. Preserve it when importing.",
	name: "Display name.", slug: "URL-friendly name.", description: "Descriptive text.",
	url: "Absolute storefront URL.", image: "Absolute image URL.",
	price: "Current unit selling price. Numeric amount, not formatted text.",
	list_price: "Original unit price before discounts.", on_sale: "Whether the product is on sale.",
	categories: "Integer category IDs; join to categories.id.",
	created_at: "Product creation time, Unix timestamp in seconds (UTC).",
	brand: "Brand name.", color: "List of available color names as plain strings.",
	reviews_amount: "Number of reviews.", reviews_avg: "Average review score out of five.",
	material: "Product material.", size_options: "List of available size labels.",
	collection: "Merchandising collection.", season: "Season label.", tags: "Merchandising tags.",
	stock_status: "Stock availability label.", inventory: "Available unit count.",
	is_featured: "Whether featured in the shop.", is_new: "Whether marked as new.",
	department: "Top-level merchandise department.", sku: "Stock keeping unit.",
	margin_group: "Integer margin rank from 1 (lowest) to 5 (highest).",
	profit: "Estimated profit per unit, expressed as a monetary amount, not a percentage.",
	margin_percent: "Estimated profit as a percentage of the current selling price.",
	subcategories: "Direct child category IDs; an empty list means no children.",
	parentId: "Parent category ID. Optional; absent for top-level categories.",
	customer: "Integer customer ID; join to customers.id.", customer_name: "Customer display name.",
	email: "Fictional customer email address, also used to associate orders with customers.",
	products: "Purchased line items; this is not a list of complete product objects.",
	"products[].id": "Product ID; join to products.id.",
	"products[].quantity": "Number of units purchased.",
	"products[].price": "Historical unit price at purchase, in the order's currency.",
	time: "Order placement time, Unix timestamp in seconds (UTC).",
	currency: "Currency code for order amounts; currently DKK.",
	order_status: "Overall simulated order status; parcel status is reported separately.",
	order_total: "Sum of purchased line-item quantity multiplied by unit price.",
	delivery_estimate: "Human-readable estimated delivery window, for example 5 to 7 days.",
	tracking: "List of parcels; one order can have more than one parcel.",
	"tracking[].carrier": "Fictional carrier abbreviation: GLS, UPS or FedEx.",
	"tracking[].carrier_name": "Positive fictional expansion of the carrier abbreviation.",
	"tracking[].tracking_code": "Parcel tracking reference.",
	"tracking[].tracking_link": "Fictional .example tracking URL; it is not a working carrier service.",
	"tracking[].status": "Current machine-readable parcel status.",
	"tracking[].status_text": "Human-readable parcel status.",
	"tracking[].estimated_delivery": "Estimated arrival time, Unix timestamp in seconds (UTC).",
	"tracking[].last_updated": "Most recent parcel update, Unix timestamp in seconds (UTC).",
	"tracking[].events": "Parcel status history.",
	"tracking[].events[].status": "Machine-readable event status.",
	"tracking[].events[].status_text": "Human-readable event description.",
	"tracking[].events[].time": "Event time, Unix timestamp in seconds (UTC).",
	type: "Content type; currently blog.", title: "Article title.",
	text: "Full article body as a string; paragraph breaks are encoded as newline characters.",
	keywords: "Article topic keywords.", date: "Article publication date as YYYY-MM-DD.",
	subscribed: "Marketing subscription flag. Fictional demo customers are not subscribed.",
	order_delivery_estimates: "Long text with one line per order, pairing its ID with the delivery estimate and tracking status.",
	order_ids: "Integer IDs of this customer's orders, sorted by ID; join to orders.id.",
	order_tracking_statuses: "Parallel list: position i is the primary parcel status for order_ids[i], with order status as a fallback. Keep the two lists aligned.",
};

function fieldRows(record: Record<string, unknown>, prefix = ""): { field: string; type: string; description: string }[] {
	return Object.entries(record).flatMap(([key, value]) => {
		const field = `${prefix}${key}`;
		const array = Array.isArray(value);
		const example = array ? value[0] : value;
		const type = example === null ? "null" : typeof example === "number" ? "number" : typeof example;
		const elementType = example === undefined ? (key === "subcategories" ? "number" : "unknown") : type;
		const row = { field, type: array ? `${elementType}[]` : type, description: descriptions[field] || "Additional custom attribute; preserve its value and type." };
		return [row, ...(example && typeof example === "object" && !Array.isArray(example) ? fieldRows(example as Record<string, unknown>, `${field}${array ? "[]" : ""}.`) : [])];
	});
}

export function apiDocumentation(baseUrl: string) {
	const datasets = {
		products: products.map((record) => productToFeed(record, baseUrl)),
		categories: categories.map((record) => categoryToFeed(record, baseUrl)),
		orders,
		pages: blogPages.map((record) => pageToFeed(record, baseUrl)),
		customers,
	};
	return Object.entries(datasets).map(([resource, records]) => {
		const record = structuredClone(records[0]) as Record<string, any>;
		let note = "One real record is shown; the response contains all records, not just this example.";
		if (resource === "pages") {
			record.text = `${record.text.slice(0, 350)}…`;
			note += " The article text is shortened here; the endpoint returns the full text.";
		}
		if (resource === "customers") {
			record.order_ids = record.order_ids.slice(0, 2);
			record.order_tracking_statuses = record.order_tracking_statuses.slice(0, 2);
			record.order_delivery_estimates = record.order_delivery_estimates.split("\n").slice(0, 2).join("\n");
			note += " This example shows only the first two orders; the endpoint includes the customer's full order history.";
		}
		const schemaRecord = { ...records[0] } as Record<string, unknown>;
		if (resource === "categories") schemaRecord.parentId = categories.find((category) => category.parentId !== undefined)?.parentId;
		return { resource, count: records.length, example: JSON.stringify([record], null, 2), note, fields: fieldRows(schemaRecord) };
	});
}
