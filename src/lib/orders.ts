import type { Product } from "./catalog";
import { products } from "./catalog";
import ordersArchive from "../data/orders-archive.json";

export type OrderProduct = {
	id: number;
	quantity: number;
	price: number;
};

export type TrackingEvent = {
	status: string;
	status_text: string;
	time: number;
};

export type TrackingParcel = {
	carrier: "GLS" | "UPS" | "FedEx";
	carrier_name: string;
	tracking_code: string;
	tracking_link: string;
	status: string;
	status_text: string;
	estimated_delivery: number;
	last_updated: number;
	events: TrackingEvent[];
};

export type Order = {
	id: number;
	customer: number;
	customer_name: string;
	email: string;
	products: OrderProduct[];
	time: number;
	currency: "DKK";
	order_status: string;
	order_total: number;
	tracking: TrackingParcel[];
};

type Customer = {
	id: number;
	name: string;
	email: string;
};

type Recipe = {
	anchors: number[];
	companions: number[];
};

type Carrier = {
	code: TrackingParcel["carrier"];
	name: string;
	host: string;
};

const ARCHIVED_ORDER_COUNT = 10_000;
const ARCHIVED_CATALOG_MAX_PRODUCT_ID = 10_512;
const FUTURE_ORDER_SLOTS_PER_PRODUCT = 8;
const FIRST_FUTURE_ORDER_ID = 7_010_001;
const DAY = 86_400;
const HOUR = 3_600;
const ORDER_LATEST_TIME = 1_788_134_400;
const ORDER_HISTORY_DAYS = 730;

const leafCategoryIds = [101, 102, 103, 201, 202, 301, 302, 401, 402, 403, 501, 502, 601, 602, 701, 702, 801, 802];

const customers: Customer[] = [
	{ id: 8000, name: "Luke Skywalker", email: "luke@skywalker.example" },
	{ id: 8001, name: "Neo", email: "neo@matrix.example" },
	{ id: 8002, name: "Ellen Ripley", email: "ripley@nostromo.example" },
	{ id: 8003, name: "Hermione Granger", email: "hermione@hogwarts.example" },
	{ id: 8004, name: "Frodo Baggins", email: "frodo@shire.example" },
	{ id: 8005, name: "Tony Stark", email: "tony@stark.example" },
	{ id: 8006, name: "Arya Stark", email: "arya@winterfell.example" },
	{ id: 8007, name: "Jean-Luc Picard", email: "picard@enterprise.example" },
	{ id: 8008, name: "Marty McFly", email: "marty@hillvalley.example" },
	{ id: 8009, name: "Leia Organa", email: "leia@alderaan.example" },
	{ id: 8010, name: "Trinity", email: "trinity@matrix.example" },
	{ id: 8011, name: "Morpheus", email: "morpheus@zion.example" },
	{ id: 8012, name: "Dana Scully", email: "scully@xfiles.example" },
	{ id: 8013, name: "Fox Mulder", email: "mulder@xfiles.example" },
	{ id: 8014, name: "Buffy Summers", email: "buffy@sunnydale.example" },
	{ id: 8015, name: "Wednesday Addams", email: "wednesday@nevermore.example" },
	{ id: 8016, name: "Sherlock Holmes", email: "sherlock@221b.example" },
	{ id: 8017, name: "Diana Prince", email: "diana@themyscira.example" },
	{ id: 8018, name: "Peter Parker", email: "peter@queens.example" },
	{ id: 8019, name: "Joy", email: "joy@headquarters.example" },
	{ id: 8020, name: "Rick Sanchez", email: "rick@citadel.example" },
	{ id: 8021, name: "Morty Smith", email: "morty@dimensionc137.example" },
	{ id: 8022, name: "Samwise Gamgee", email: "sam@theshire.example" },
	{ id: 8023, name: "Aragorn", email: "aragorn@gondor.example" },
	{ id: 8024, name: "Gandalf", email: "gandalf@middleearth.example" },
	{ id: 8025, name: "Moana", email: "moana@motunui.example" },
	{ id: 8026, name: "Max Mayfield", email: "max@hawkins.example" },
	{ id: 8027, name: "Eleven", email: "eleven@hawkins.example" },
	{ id: 8028, name: "Clark Kent", email: "clark@dailyplanet.example" },
	{ id: 8029, name: "Lois Lane", email: "lois@dailyplanet.example" },
	{ id: 8030, name: "Jules Winnfield", email: "jules@fiction.example" },
	{ id: 8031, name: "Pete Mitchell", email: "maverick@topgun.example" },
];

const recipes: Recipe[] = [
	{ anchors: [101, 102, 103], companions: [201, 202, 301] },
	{ anchors: [201, 202], companions: [301, 302, 702] },
	{ anchors: [301], companions: [302, 701, 702] },
	{ anchors: [401], companions: [402, 403, 802] },
	{ anchors: [402], companions: [401, 403] },
	{ anchors: [403], companions: [501, 502, 401] },
	{ anchors: [501], companions: [502, 403, 301] },
	{ anchors: [502], companions: [501, 403, 302] },
	{ anchors: [601, 602], companions: [701, 702, 302] },
	{ anchors: [701, 702], companions: [301, 302, 601] },
	{ anchors: [801, 802], companions: [401, 402, 301] },
];

const carriers: Carrier[] = [
	{ code: "GLS", name: "Good Life Shipping", host: "track.gls.example" },
	{ code: "UPS", name: "Upbeat Parcel Service", host: "track.ups.example" },
	{ code: "FedEx", name: "Feel-good Delivery Express", host: "track.fedex.example" },
];

const statusText: Record<string, string> = {
	PROCESSING: "Your parcel is being prepared with care.",
	SENT: "Your parcel has left the Awesome Store studio.",
	IN_TRANSIT: "Your parcel is in transit and making excellent progress.",
	OUT_FOR_DELIVERY: "Your parcel is out for delivery today.",
	DELIVERED: "Your parcel was delivered safely.",
	EXCEPTION: "Delivery is paused briefly for an address check.",
	RETURNED: "Your parcel completed a cheerful detour back to sender.",
};

function createRng(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1_664_525 + 1_013_904_223) >>> 0;
		return state / 4_294_967_296;
	};
}

function pick<T>(items: T[], rng: () => number) {
	return items[Math.floor(rng() * items.length)] ?? items[0];
}

function money(value: number) {
	return Math.round(value * 100) / 100;
}

function token(rng: () => number, length: number) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	return Array.from({ length }, () => alphabet[Math.floor(rng() * alphabet.length)]).join("");
}

const productsByCategory = new Map<number, Product[]>();
for (const categoryId of leafCategoryIds) {
	productsByCategory.set(categoryId, products.filter((product) => product.categories.includes(categoryId)));
}

function chooseItemCount(rng: () => number) {
	const roll = rng();
	if (roll < 0.35) return 1;
	if (roll < 0.8) return 2;
	if (roll < 0.97) return 3;
	return rng() < 0.75 ? 4 : 5;
}

function chooseOrderStatus(ageDays: number, rng: () => number) {
	const roll = rng();
	if (ageDays > 45) {
		if (roll < 0.84) return "DELIVERED";
		if (roll < 0.91) return "RETURNED";
		return "EXCEPTION";
	}
	if (ageDays > 10) {
		if (roll < 0.58) return "DELIVERED";
		if (roll < 0.68) return "RETURNED";
		if (roll < 0.75) return "EXCEPTION";
		if (roll < 0.9) return "IN_TRANSIT";
		return "SENT";
	}
	if (ageDays > 2) {
		if (roll < 0.18) return "DELIVERED";
		if (roll < 0.48) return "IN_TRANSIT";
		if (roll < 0.72) return "SENT";
		if (roll < 0.9) return "OUT_FOR_DELIVERY";
		return "PROCESSING";
	}
	if (roll < 0.56) return "PROCESSING";
	if (roll < 0.87) return "SENT";
	return "IN_TRANSIT";
}

function eventTimeline(orderTime: number, status: string) {
	const steps: TrackingEvent[] = [
		{ status: "ORDER_RECEIVED", status_text: "Order received by Awesome Store.", time: orderTime },
		{ status: "PROCESSING", status_text: statusText.PROCESSING, time: orderTime + 6 * HOUR },
		{ status: "SENT", status_text: statusText.SENT, time: orderTime + DAY },
		{ status: "IN_TRANSIT", status_text: statusText.IN_TRANSIT, time: orderTime + 2 * DAY },
		{ status: "OUT_FOR_DELIVERY", status_text: statusText.OUT_FOR_DELIVERY, time: orderTime + 4 * DAY },
		{ status: "DELIVERED", status_text: statusText.DELIVERED, time: orderTime + 5 * DAY },
	];
	const statusIndex: Record<string, number> = {
		PROCESSING: 1,
		SENT: 2,
		IN_TRANSIT: 3,
		OUT_FOR_DELIVERY: 4,
		DELIVERED: 5,
		EXCEPTION: 3,
		RETURNED: 5,
	};
	const index = statusIndex[status] ?? 1;
	const events = steps.slice(0, index + 1);
	if (status === "EXCEPTION") {
		events.push({ status, status_text: statusText.EXCEPTION, time: orderTime + 3 * DAY });
	}
	if (status === "RETURNED") {
		events.push({ status, status_text: statusText.RETURNED, time: orderTime + 8 * DAY });
	}
	return events;
}

function createTracking(orderId: number, orderTime: number, status: string, parcelIndex: number, rng: () => number): TrackingParcel {
	const carrier = pick(carriers, rng);
	const trackingCode = `${carrier.code}-AW-${String(orderId).slice(-6)}-${token(rng, 6)}${parcelIndex ? `-${parcelIndex + 1}` : ""}`;
	const events = eventTimeline(orderTime, status);
	const lastUpdated = Math.min(events.at(-1)?.time ?? orderTime, ORDER_LATEST_TIME);
	return {
		carrier: carrier.code,
		carrier_name: carrier.name,
		tracking_code: trackingCode,
		tracking_link: `https://${carrier.host}/parcel/${trackingCode}`,
		status,
		status_text: statusText[status] ?? status,
		estimated_delivery: Math.min(orderTime + 5 * DAY, ORDER_LATEST_TIME),
		last_updated: lastUpdated,
		events: events.map((event) => ({ ...event, time: Math.min(event.time, ORDER_LATEST_TIME) })),
	};
}

function createFutureOrder(focalProduct: Product, slot: number): Order {
	const productOffset = focalProduct.id - ARCHIVED_CATALOG_MAX_PRODUCT_ID - 1;
	const orderId = FIRST_FUTURE_ORDER_ID + productOffset * FUTURE_ORDER_SLOTS_PER_PRODUCT + slot;
	const rng = createRng(0xF00D00 + focalProduct.id * 97 + slot * 1_009);
	const customer = customers[(orderId * 7 + Math.floor(rng() * customers.length)) % customers.length] ?? customers[0];
	const orderTime = ORDER_LATEST_TIME - Math.floor(rng() * ORDER_HISTORY_DAYS * DAY);
	const ageDays = (ORDER_LATEST_TIME - orderTime) / DAY;
	const itemCount = chooseItemCount(rng);
	const focalCategoryId = focalProduct.categories[0] ?? leafCategoryIds[0];
	const recipe = recipes.find((candidate) => candidate.anchors.includes(focalCategoryId)) ?? recipes[0];
	const categoryChoices = [focalCategoryId];
	while (categoryChoices.length < itemCount) {
		const pool = rng() < 0.72 ? recipe.companions : [...recipe.anchors, ...recipe.companions];
		categoryChoices.push(pick(pool, rng));
	}

	// A future product is always the focal item. Companion selection is capped
	// at its ID, so adding later products cannot change this order's output.
	const usedIds = new Set<number>([focalProduct.id]);
	const orderProducts: OrderProduct[] = [{ id: focalProduct.id, quantity: rng() < 0.08 ? 2 : 1, price: focalProduct.price }];
	for (const categoryId of categoryChoices.slice(1)) {
		const available = (productsByCategory.get(categoryId) ?? products).filter(
			(product) => product.id <= focalProduct.id && !usedIds.has(product.id),
		);
		if (!available.length) continue;
		const product = available[Math.floor(rng() * available.length)];
		if (!product) continue;
		usedIds.add(product.id);
		orderProducts.push({ id: product.id, quantity: rng() < 0.08 ? 2 : 1, price: product.price });
	}

	const orderStatus = chooseOrderStatus(ageDays, rng);
	const parcelCount = orderProducts.length >= 4 && rng() < 0.18 ? 2 : 1;
	const tracking = Array.from({ length: parcelCount }, (_, parcelIndex) => {
		const parcelStatus = parcelIndex === 0 || orderStatus === "DELIVERED" ? orderStatus : orderStatus === "OUT_FOR_DELIVERY" ? "IN_TRANSIT" : orderStatus;
		return createTracking(orderId, orderTime, parcelStatus, parcelIndex, rng);
	});
	const orderTotal = orderProducts.reduce((total, item) => total + item.price * item.quantity, 0);

	return {
		id: orderId,
		customer: customer.id,
		customer_name: customer.name,
		email: customer.email,
		products: orderProducts,
		time: orderTime,
		currency: "DKK",
		order_status: orderStatus,
		order_total: money(orderTotal),
		tracking,
	};
}

const archivedOrders = ordersArchive as Order[];
if (archivedOrders.length !== ARCHIVED_ORDER_COUNT) {
	throw new Error(`Awesome Store order archive expected ${ARCHIVED_ORDER_COUNT} orders, found ${archivedOrders.length}`);
}

const futureProducts = products
	.filter((product) => product.id > ARCHIVED_CATALOG_MAX_PRODUCT_ID)
	.sort((left, right) => left.id - right.id);
const futureOrders = futureProducts.flatMap((product) =>
	Array.from({ length: FUTURE_ORDER_SLOTS_PER_PRODUCT }, (_, slot) => createFutureOrder(product, slot)),
);

export const orders: Order[] = [...archivedOrders, ...futureOrders];

if (new Set(orders.map((order) => order.id)).size !== orders.length) {
	throw new Error("Awesome Store order archive and append-only orders contain duplicate IDs");
}
