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
	const estimates = customer.order_delivery_estimates;
	assert(estimates && typeof estimates === "object" && !Array.isArray(estimates), "Delivery estimates must be a dictionary");
	for (const [orderId, estimate] of Object.entries(estimates)) {
		const order = ordersById.get(orderId);
		assert(order, `Customer ${customer.id} references unknown order ${orderId}`);
		assert.equal(order.customer, customer.id, `Order ${orderId} belongs to another customer`);
		assert.equal(order.email, customer.email);
		assert.equal(order.customer_name, customer.name);
		assert.equal(typeof estimate, "string");
		assert.equal(estimate, order.delivery_estimate, `Estimate differs for order ${orderId}`);
		entries++;
	}
}
for (const order of orders) {
	assert.equal(customersById.get(order.customer)?.order_delivery_estimates[String(order.id)], order.delivery_estimate,
		`Missing customer mapping for order ${order.id}`);
}
assert.equal(entries, orders.length, "Every order must be mapped exactly once");
console.log(`Customer feed validation passed: ${customers.length} customers, ${entries} matching order delivery estimates.`);
