import assert from "node:assert/strict";
import test from "node:test";
import { customersFromOrders } from "../../src/lib/customer-feed.ts";

const order = (id, customer, estimate, status = "SENT") => ({
	id, customer, customer_name: `Customer ${customer}`, email: `customer${customer}@demo.example`,
	delivery_estimate: estimate,
	order_status: status,
	tracking: [{ status }],
});

test("maps only the customer's own orders in both formats", () => {
	const input = [order(7000001, 8001, "5 to 7 days", "IN_TRANSIT"), order(7000002, 8000, "6 to 7 days"), order(7000003, 8001, "3 to 5 days", "DELIVERED")];
	const baseline = structuredClone(input);
	const customers = customersFromOrders(input);
	assert.deepEqual(customers.map((customer) => customer.id), [8000, 8001]);
	assert.equal(customers[0].order_delivery_estimates, "Order 7000002: estimated delivery 6 to 7 days; tracking status SENT.");
	assert.equal(customers[1].order_delivery_estimates, "Order 7000001: estimated delivery 5 to 7 days; tracking status IN_TRANSIT.\nOrder 7000003: estimated delivery 3 to 5 days; tracking status DELIVERED.");
	assert.deepEqual(customers[1].order_ids, [7000001, 7000003]);
	assert.deepEqual(customers[1].order_tracking_statuses, ["IN_TRANSIT", "DELIVERED"]);
	assert(customers.every((customer) => customer.subscribed === false));
	assert.deepEqual(input, baseline);
});

test("appending an order adds a mapping without changing old mappings", () => {
	const first = order(7000001, 8000, "5 to 7 days");
	const old = customersFromOrders([first]);
	const updated = customersFromOrders([first, order(7010001, 8000, "6 to 7 days")]);
	assert(updated[0].order_delivery_estimates.startsWith(old[0].order_delivery_estimates + "\n"));
	assert(updated[0].order_delivery_estimates.includes("Order 7010001: estimated delivery 6 to 7 days"));
	assert.deepEqual(updated[0].order_ids, [7000001, 7010001]);
	assert.deepEqual(customersFromOrders([]), []);
});

test("hundreds of orders stay aligned and are not truncated or independently sorted", () => {
	const input = Array.from({ length: 500 }, (_, i) => order(7000000 + i, 8000, "5 to 7 days", i % 2 ? "SENT" : "DELIVERED"));
	const [customer] = customersFromOrders([...input].reverse());
	assert.deepEqual(customer, customersFromOrders(input)[0]);
	assert.equal(customer.order_delivery_estimates.split("\n").length, 500);
	assert.equal(customer.order_ids.length, 500);
	assert.equal(customer.order_tracking_statuses.length, 500);
	for (let i = 0; i < 500; i++) {
		assert.equal(customer.order_ids[i], input[i].id);
		assert.equal(customer.order_tracking_statuses[i], input[i].order_status);
	}
});

test("uses the primary parcel status with an order-status fallback", () => {
	const first = order(7000001, 8000, "5 to 7 days", "SENT");
	first.tracking = [{ status: "OUT_FOR_DELIVERY" }, { status: "IN_TRANSIT" }];
	const second = { ...order(7000002, 8000, "6 to 7 days", "PROCESSING"), tracking: [] };
	assert.deepEqual(customersFromOrders([first, second])[0].order_tracking_statuses, ["OUT_FOR_DELIVERY", "PROCESSING"]);
});

test("rejects duplicate orders and conflicting identities", () => {
	const first = order(7000001, 8000, "5 to 7 days");
	assert.throws(() => customersFromOrders([first, first]), /Duplicate order/);
	assert.throws(() => customersFromOrders([first, { ...first, id: 7000002, email: "another@demo.example" }]), /Inconsistent customer identity/);
});
