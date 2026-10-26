import type { Order } from "./orders";

export type FeedCustomer = {
	id: number;
	name: string;
	email: string;
	subscribed: false;
	order_delivery_estimates: string;
	order_ids: number[];
	order_tracking_statuses: string[];
};

export function customersFromOrders(orders: readonly Order[]): FeedCustomer[] {
	const customers = new Map<number, FeedCustomer>();
	const summaries = new Map<number, string[]>();
	const seenOrderIds = new Set<number>();
	// Sort the source records once, never the parallel lists independently.
	for (const order of [...orders].sort((left, right) => left.id - right.id)) {
		let customer = customers.get(order.customer);
		if (!customer) {
			customer = {
				id: order.customer,
				name: order.customer_name,
				email: order.email,
				// These are fictional customers, not marketing subscribers.
				subscribed: false,
				order_delivery_estimates: "",
				order_ids: [],
				order_tracking_statuses: [],
			};
			customers.set(customer.id, customer);
			summaries.set(customer.id, []);
		} else if (customer.email !== order.email || customer.name !== order.customer_name) {
			throw new Error(`Inconsistent customer identity for customer ${order.customer}`);
		}
		if (seenOrderIds.has(order.id)) {
			throw new Error(`Duplicate order ${order.id} in customer delivery estimates`);
		}
		seenOrderIds.add(order.id);
		const status = order.tracking[0]?.status || order.order_status;
		customer.order_ids.push(order.id);
		customer.order_tracking_statuses.push(status);
		summaries.get(customer.id)!.push(`Order ${order.id}: estimated delivery ${order.delivery_estimate}; tracking status ${status}.`);
	}
	for (const customer of customers.values()) {
		customer.order_delivery_estimates = summaries.get(customer.id)!.join("\n");
	}
	return [...customers.values()].sort((left, right) => left.id - right.id);
}
