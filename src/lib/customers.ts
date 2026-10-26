import { orders } from "./orders";
import { customersFromOrders } from "./customer-feed";

export const customers = customersFromOrders(orders);
