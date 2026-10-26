import type { Order } from "./orders";

export type FeedCustomer = {
	id: number;
	name: string;
	email: string;
	subscribed: false;
	order_delivery_estimates: Record<string, string>;
};

export function customersFromOrders(orders: readonly Order[]): FeedCustomer[] {
	const customers = new Map<number, FeedCustomer>();
	for (const order of orders) {
		let customer = customers.get(order.customer);
		if (!customer) {
			customer = {
				id: order.customer,
				name: order.customer_name,
				email: order.email,
				// These are fictional customers, not marketing subscribers.
				subscribed: false,
				order_delivery_estimates: {},
			};
			customers.set(customer.id, customer);
		} else if (customer.email !== order.email || customer.name !== order.customer_name) {
			throw new Error(`Inconsistent customer identity for customer ${order.customer}`);
		}
		const orderId = String(order.id);
		if (Object.hasOwn(customer.order_delivery_estimates, orderId)) {
			throw new Error(`Duplicate order ${order.id} in customer delivery estimates`);
		}
		customer.order_delivery_estimates[orderId] = order.delivery_estimate;
	}
	return [...customers.values()].sort((left, right) => left.id - right.id);
}
