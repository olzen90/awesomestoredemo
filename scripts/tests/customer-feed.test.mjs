import assert from "node:assert/strict";
import test from "node:test";
import { customersFromOrders } from "../../src/lib/customer-feed.ts";

const order = (id, customer, estimate) => ({
	id, customer, customer_name: `Customer ${customer}`, email: `customer${customer}@demo.example`,
	delivery_estimate: estimate,
});

test("maps only the customer's own orders and keeps estimates as strings", () => {
	const input = [order(7000001, 8001, "5 to 7 days"), order(7000002, 8000, "6 to 7 days"), order(7000003, 8001, "3 to 5 days")];
	const baseline = structuredClone(input);
	const customers = customersFromOrders(input);
	assert.deepEqual(customers.map((customer) => customer.id), [8000, 8001]);
	assert.deepEqual(customers[0].order_delivery_estimates, { "7000002": "6 to 7 days" });
	assert.deepEqual(customers[1].order_delivery_estimates, { "7000001": "5 to 7 days", "7000003": "3 to 5 days" });
	assert(customers.every((customer) => customer.subscribed === false));
	assert.deepEqual(input, baseline);
});

test("appending an order adds a mapping without changing old mappings", () => {
	const first = order(7000001, 8000, "5 to 7 days");
	const old = customersFromOrders([first]);
	const updated = customersFromOrders([first, order(7010001, 8000, "6 to 7 days")]);
	assert.equal(updated[0].order_delivery_estimates["7000001"], old[0].order_delivery_estimates["7000001"]);
	assert.equal(updated[0].order_delivery_estimates["7010001"], "6 to 7 days");
	assert.deepEqual(customersFromOrders([]), []);
});

test("rejects duplicate orders and conflicting identities", () => {
	const first = order(7000001, 8000, "5 to 7 days");
	assert.throws(() => customersFromOrders([first, first]), /Duplicate order/);
	assert.throws(() => customersFromOrders([first, { ...first, id: 7000002, email: "another@demo.example" }]), /Inconsistent customer identity/);
});
