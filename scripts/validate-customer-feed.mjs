import assert from "node:assert/strict";
import fs from "node:fs";

const readFeed = (name) => JSON.parse(fs.readFileSync(new URL(`../dist/feeds/${name}.json`, import.meta.url), "utf8"));
const customers = readFeed("customers");
const orders = readFeed("orders");
const combined = readFeed("clerk");
assert(Array.isArray(customers), "Customer feed must be an array");
assert.deepEqual(combined.customers, customers, "Customer feeds must match");
const customersById = new Map(customers.map((customer) => [customer.id, customer]));
assert.equal(customersById.size, customers.length, "Duplicate customer IDs");
assert.equal(customers.length, new Set(orders.map((order) => order.customer)).size, "Customer count differs from order history");
let entries = 0;
const ordersById = new Map(orders.map((order) => [String(order.id), order]));
for (const customer of customers) {
	assert(Number.isInteger(customer.id), "Customer ID must remain an integer");
	assert.equal(typeof customer.name, "string");
	assert(customer.name.length > 0);
	assert.equal(typeof customer.email, "string");
	assert(customer.email.endsWith(".example"), "Customer feed must use fictional emails");
	assert.equal(customer.subscribed, false, "Fictional customers must not be subscribed");
	assert.equal(typeof customer.order_delivery_estimates, "string", "Delivery estimates must be one long string");
	assert(Array.isArray(customer.order_ids), "Order IDs must be a list");
	assert(Array.isArray(customer.order_tracking_statuses), "Tracking statuses must be a list");
	assert.equal(customer.order_ids.length, customer.order_tracking_statuses.length, "Parallel lists must have equal lengths");
	assert.equal(new Set(customer.order_ids).size, customer.order_ids.length, "Duplicate customer order IDs");
	const expectedLines = [];
	for (const [index, orderId] of customer.order_ids.entries()) {
		assert(Number.isInteger(orderId), "Order IDs must remain integers");
		const order = ordersById.get(String(orderId));
		assert(order, `Customer ${customer.id} references unknown order ${orderId}`);
		assert.equal(order.customer, customer.id, `Order ${orderId} belongs to another customer`);
		assert.equal(order.email, customer.email);
		assert.equal(order.customer_name, customer.name);
		const status = order.tracking[0]?.status || order.order_status;
		assert.equal(typeof customer.order_tracking_statuses[index], "string");
		assert.equal(customer.order_tracking_statuses[index], status, `Wrong status at index ${index} for order ${orderId}`);
		expectedLines.push(`Order ${orderId}: estimated delivery ${order.delivery_estimate}; tracking status ${status}.`);
		entries++;
	}
	assert.deepEqual(customer.order_ids, [...customer.order_ids].sort((left, right) => left - right), "Order list must be deterministic");
	assert.equal(customer.order_delivery_estimates, expectedLines.join("\n"), "Long string must include exactly the same orders and values");
}
for (const order of orders) {
	const customer = customersById.get(order.customer);
	assert(customer?.order_ids.includes(order.id), `Missing customer mapping for order ${order.id}`);
}
assert.equal(entries, orders.length, "Every order must be mapped exactly once");
console.log(`Customer feed validation passed: ${customers.length} customers, ${entries} order summaries and aligned tracking-status entries.`);
