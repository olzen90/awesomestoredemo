export type ColorAttribute = {
	name: string;
	converted_name: string;
	image: string;
	color_code: string;
};

export type Category = {
	id: number;
	name: string;	slug: string;
	url: string;
	subcategories: number[];
	description: string;
	image: string;
	parentId?: number;
};

export type Product = {
	id: number;
	name: string;
	slug: string;
	description: string;
	price: number;
	list_price: number;
	on_sale: boolean;
	image: string;
	url: string;
	categories: number[];
	created_at: number;
	brand: string;
	color: ColorAttribute;
	reviews_amount: number;
	reviews_avg: number;
	material: string;
	size_options: string[];
	collection: string;
	season: string;
	tags: string[];
	stock_status: string;
	inventory: number;
	is_featured: boolean;
	is_new: boolean;
	department: string;
	sku: string;
	margin_group: number;
	[key: string]: unknown;
};

export type BlogPage = {
	id: number;
	type: "blog";
	slug: string;
	url: string;
	title: string;
	text: string;
	image: string;
	keywords: string[];
	date: string;
};

type ProductGroup = {
	department: string;
	categoryId: number;
	collection: string;
	types: string[];
	descriptors: string[];
	materials: string[];
	colors: Array<{ name: string; converted_name: string; color_code: string }>;
	brands: string[];
	tags: string[];
	basePrice: number;
	sizes: string[];
};

const BASE_IMAGE = "/images/products";
const DAY = 86_400;
const CREATED_AT = 1_744_000_000;

export const storeName = "Awesome Store";

export const categories: Category[] = [
	{
		id: 100,
		name: "Apparel",
		slug: "apparel",
		url: "/category/apparel",
		subcategories: [101, 102, 103],
		description: "Quiet layers and everyday staples with considered details.",
		image: `${BASE_IMAGE}/product-0001.jpg`,
	},
	{
		id: 101,
		name: "Shirts & layers",
		slug: "shirts-layers",
		url: "/category/shirts-layers",
		subcategories: [],
		parentId: 100,
		description: "Lightweight overshirts, knits, and easy layers.",
		image: `${BASE_IMAGE}/product-0001.jpg`,
	},
	{
		id: 102,
		name: "Tops",
		slug: "tops",
		url: "/category/tops",
		subcategories: [],
		parentId: 100,
		description: "Soft jersey essentials for the everyday rotation.",
		image: `${BASE_IMAGE}/product-0021.jpg`,
	},
	{
		id: 103,
		name: "Bottoms",
		slug: "bottoms",
		url: "/category/bottoms",
		subcategories: [],
		parentId: 100,
		description: "Relaxed trousers and refined everyday bottoms.",
		image: `${BASE_IMAGE}/product-0031.jpg`,
	},
	{
		id: 200,
		name: "Footwear",
		slug: "footwear",
		url: "/category/footwear",
		subcategories: [201, 202],
		description: "Comfort-first footwear made for the long way around.",
		image: `${BASE_IMAGE}/product-0041.jpg`,
	},
	{
		id: 201,
		name: "Everyday shoes",
		slug: "everyday-shoes",
		url: "/category/everyday-shoes",
		subcategories: [],
		parentId: 200,
		description: "Clean silhouettes for commutes, cafés, and city miles.",
		image: `${BASE_IMAGE}/product-0041.jpg`,
	},
	{
		id: 202,
		name: "Trail & active",
		slug: "trail-active",
		url: "/category/trail-active",
		subcategories: [],
		parentId: 200,
		description: "Practical traction and breathable comfort for outside.",
		image: `${BASE_IMAGE}/product-0051.jpg`,
	},
	{
		id: 300,
		name: "Bags & travel",
		slug: "bags-travel",
		url: "/category/bags-travel",
		subcategories: [301, 302],
		description: "Carry systems for short trips and long weekends.",
		image: `${BASE_IMAGE}/product-0061.jpg`,
	},
	{
		id: 301,
		name: "Bags",
		slug: "bags",
		url: "/category/bags",
		subcategories: [],
		parentId: 300,
		description: "Well-made totes, packs, and crossbody carry.",
		image: `${BASE_IMAGE}/product-0061.jpg`,
	},
	{
		id: 302,
		name: "Travel accessories",
		slug: "travel-accessories",
		url: "/category/travel-accessories",
		subcategories: [],
		parentId: 300,
		description: "Small tools that make leaving home feel easy.",
		image: `${BASE_IMAGE}/product-0071.jpg`,
	},
	{
		id: 400,
		name: "Home",
		slug: "home",
		url: "/category/home",
		subcategories: [401, 402, 403],
		description: "Useful objects with a little more thought in them.",
		image: `${BASE_IMAGE}/product-0081.jpg`,
	},
	{
		id: 401,
		name: "Kitchen & table",
		slug: "kitchen-table",
		url: "/category/kitchen-table",
		subcategories: [],
		parentId: 400,
		description: "Ceramics, glassware, and tools for daily rituals.",
		image: `${BASE_IMAGE}/product-0081.jpg`,
	},
	{
		id: 402,
		name: "Soft goods",
		slug: "soft-goods",
		url: "/category/soft-goods",
		subcategories: [],
		parentId: 400,
		description: "Texture and comfort for the corners you live in.",
		image: `${BASE_IMAGE}/product-0091.jpg`,
	},
	{
		id: 403,
		name: "Lighting & objects",
		slug: "lighting-objects",
		url: "/category/lighting-objects",
		subcategories: [],
		parentId: 400,
		description: "Small-scale lighting and sculptural everyday pieces.",
		image: `${BASE_IMAGE}/product-0101.jpg`,
	},
	{
		id: 500,
		name: "Desk & tech",
		slug: "desk-tech",
		url: "/category/desk-tech",
		subcategories: [501, 502],
		description: "A calmer setup for focused work and clear thinking.",
		image: `${BASE_IMAGE}/product-0121.jpg`,
	},
	{
		id: 501,
		name: "Desk essentials",
		slug: "desk-essentials",
		url: "/category/desk-essentials",
		subcategories: [],
		parentId: 500,
		description: "Pens, notebooks, and tools that earn their space.",
		image: `${BASE_IMAGE}/product-0121.jpg`,
	},
	{
		id: 502,
		name: "Power & audio",
		slug: "power-audio",
		url: "/category/power-audio",
		subcategories: [],
		parentId: 500,
		description: "Thoughtful tech accessories without the visual noise.",
		image: `${BASE_IMAGE}/product-0131.jpg`,
	},
	{
		id: 600,
		name: "Wellness",
		slug: "wellness",
		url: "/category/wellness",
		subcategories: [601, 602],
		description: "Small rituals for slower mornings and better evenings.",
		image: `${BASE_IMAGE}/product-0141.jpg`,
	},
	{
		id: 601,
		name: "Bath & body",
		slug: "bath-body",
		url: "/category/bath-body",
		subcategories: [],
		parentId: 600,
		description: "Simple, tactile objects for the daily reset.",
		image: `${BASE_IMAGE}/product-0141.jpg`,
	},
	{
		id: 602,
		name: "Movement",
		slug: "movement",
		url: "/category/movement",
		subcategories: [],
		parentId: 600,
		description: "Lightweight essentials for stretching, walking, and going.",
		image: `${BASE_IMAGE}/product-0151.jpg`,
	},
	{
		id: 700,
		name: "Outdoor",
		slug: "outdoor",
		url: "/category/outdoor",
		subcategories: [701, 702],
		description: "Reliable pieces for fresh air and open space.",
		image: `${BASE_IMAGE}/product-0161.jpg`,
	},
	{
		id: 701,
		name: "Camp & picnic",
		slug: "camp-picnic",
		url: "/category/camp-picnic",
		subcategories: [],
		parentId: 700,
		description: "Practical gear for afternoons outside.",
		image: `${BASE_IMAGE}/product-0161.jpg`,
	},
	{
		id: 702,
		name: "Weather-ready",
		slug: "weather-ready",
		url: "/category/weather-ready",
		subcategories: [],
		parentId: 700,
		description: "Layers and accessories for shifting skies.",
		image: `${BASE_IMAGE}/product-0171.jpg`,
	},
	{
		id: 800,
		name: "Gifts",
		slug: "gifts",
		url: "/category/gifts",
		subcategories: [801, 802],
		description: "Good-looking little things for people you like.",
		image: `${BASE_IMAGE}/product-0181.jpg`,
	},
	{
		id: 801,
		name: "Under $50",
		slug: "gifts-under-50",
		url: "/category/gifts-under-50",
		subcategories: [],
		parentId: 800,
		description: "Small gestures with a strong point of view.",
		image: `${BASE_IMAGE}/product-0181.jpg`,
	},
	{
		id: 802,
		name: "For the host",
		slug: "gifts-for-the-host",
		url: "/category/gifts-for-the-host",
		subcategories: [],
		parentId: 800,
		description: "Useful, memorable pieces for open doors and full tables.",
		image: `${BASE_IMAGE}/product-0191.jpg`,
	},
];

const groups: ProductGroup[] = [
	{
		department: "Apparel",
		categoryId: 101,
		collection: "Everyday Uniform",
		types: ["Overshirt", "Crewneck"],
		descriptors: ["Studio", "Transit", "Field", "Form", "Daily", "Canvas", "Drift", "Signal", "Soft", "Line"],
		materials: ["organic cotton", "washed twill", "merino blend", "recycled nylon"],
		colors: [
			{ name: "Cobalt", converted_name: "Blue", color_code: "#3455b9" },
			{ name: "Oat", converted_name: "Beige", color_code: "#d6c8aa" },
			{ name: "Charcoal", converted_name: "Gray", color_code: "#383c45" },
			{ name: "Moss", converted_name: "Green", color_code: "#65745a" },
		],
		brands: ["Northline", "Common Field", "Aster Works", "Plain Form"],
		tags: ["layering", "soft tailoring", "everyday", "transitional"],
		basePrice: 88,
		sizes: ["XS", "S", "M", "L", "XL"],
	},
	{
		department: "Apparel",
		categoryId: 102,
		collection: "Soft Rotation",
		types: ["T-Shirt", "Long Sleeve"],
		descriptors: ["Cloud", "Rib", "Studio", "Clean", "Essential", "Air", "Frame", "Easy", "Balance", "Core"],
		materials: ["supima cotton", "ribbed cotton", "linen jersey", "hemp blend"],
		colors: [
			{ name: "Chalk", converted_name: "White", color_code: "#ece9e2" },
			{ name: "Ink", converted_name: "Black", color_code: "#1f2329" },
			{ name: "Coral", converted_name: "Red", color_code: "#d87866" },
			{ name: "Sky", converted_name: "Blue", color_code: "#9ab9cf" },
		],
		brands: ["Common Field", "Plain Form", "Lumen", "Aster Works"],
		tags: ["basics", "layering", "breathable", "soft"],
		basePrice: 42,
		sizes: ["XS", "S", "M", "L", "XL"],
	},
	{
		department: "Apparel",
		categoryId: 103,
		collection: "Long Weekend",
		types: ["Trouser", "Short"],
		descriptors: ["Relaxed", "Utility", "Pleat", "Ridge", "Weekend", "Straight", "Harbor", "Studio", "Move", "Easy"],
		materials: ["cotton canvas", "linen blend", "technical nylon", "corduroy"],
		colors: [
			{ name: "Stone", converted_name: "Beige", color_code: "#b9ab91" },
			{ name: "Olive", converted_name: "Green", color_code: "#59664b" },
			{ name: "Navy", converted_name: "Blue", color_code: "#293b5b" },
			{ name: "Clay", converted_name: "Orange", color_code: "#ad654c" },
		],
		brands: ["Northline", "Aster Works", "Signal Studio", "Common Field"],
		tags: ["utility", "relaxed", "weekend", "travel"],
		basePrice: 96,
		sizes: ["28", "30", "32", "34", "36"],
	},
	{
		department: "Footwear",
		categoryId: 201,
		collection: "City Miles",
		types: ["Runner", "Slip-On"],
		descriptors: ["Metro", "Loop", "Daily", "Lane", "Pace", "Mile", "Transit", "Low", "Round", "Walk"],
		materials: ["mesh and rubber", "suede and canvas", "full-grain leather", "recycled knit"],
		colors: [
			{ name: "Rust", converted_name: "Orange", color_code: "#b8633e" },
			{ name: "Black", converted_name: "Black", color_code: "#26282c" },
			{ name: "Fog", converted_name: "Gray", color_code: "#afb3b7" },
			{ name: "Sage", converted_name: "Green", color_code: "#829783" },
		],
		brands: ["Northline", "Groundwork", "Aster Works", "Common Field"],
		tags: ["comfort", "city", "all day", "low profile"],
		basePrice: 118,
		sizes: ["39", "40", "41", "42", "43", "44", "45"],
	},
	{
		department: "Footwear",
		categoryId: 202,
		collection: "Outside Practice",
		types: ["Trail Shoe", "Hiker"],
		descriptors: ["Summit", "Ridge", "Switchback", "Cairn", "Traverse", "Pine", "Terrain", "Contour", "Track", "Roam"],
		materials: ["ripstop mesh", "waxed suede", "technical knit", "recycled nylon"],
		colors: [
			{ name: "Rust", converted_name: "Orange", color_code: "#b8633e" },
			{ name: "Forest", converted_name: "Green", color_code: "#3f5947" },
			{ name: "Slate", converted_name: "Gray", color_code: "#59636f" },
			{ name: "Sand", converted_name: "Beige", color_code: "#cbb99a" },
		],
		brands: ["Groundwork", "Northline", "Field Standard", "Aster Works"],
		tags: ["trail", "weather ready", "traction", "active"],
		basePrice: 144,
		sizes: ["39", "40", "41", "42", "43", "44", "45"],
	},
	{
		department: "Bags & Travel",
		categoryId: 301,
		collection: "Carry Well",
		types: ["Tote", "Daypack"],
		descriptors: ["Market", "Transit", "Work", "Open", "Field", "Carry", "Studio", "Weekender", "Utility", "Everyday"],
		materials: ["heavy canvas", "recycled nylon", "waxed cotton", "vegetable-tanned leather"],
		colors: [
			{ name: "Olive", converted_name: "Green", color_code: "#59664b" },
			{ name: "Ink", converted_name: "Black", color_code: "#1f2329" },
			{ name: "Natural", converted_name: "Beige", color_code: "#d7c8ae" },
			{ name: "Cobalt", converted_name: "Blue", color_code: "#3455b9" },
		],
		brands: ["Aster Works", "Northline", "Common Field", "Groundwork"],
		tags: ["carry", "commute", "travel", "organized"],
		basePrice: 74,
		sizes: ["One size"],
	},
	{
		department: "Bags & Travel",
		categoryId: 302,
		collection: "Leave Lightly",
		types: ["Packing Cube", "Travel Case"],
		descriptors: ["Fold", "Air", "Route", "Transit", "Carry", "Zip", "Cloud", "Map", "Stay", "Ready"],
		materials: ["ripstop nylon", "recycled polyester", "coated canvas", "soft poly twill"],
		colors: [
			{ name: "Cobalt", converted_name: "Blue", color_code: "#3455b9" },
			{ name: "Coral", converted_name: "Red", color_code: "#d87866" },
			{ name: "Stone", converted_name: "Beige", color_code: "#b9ab91" },
			{ name: "Charcoal", converted_name: "Gray", color_code: "#383c45" },
		],
		brands: ["Carrywell", "Common Field", "Aster Works", "Northline"],
		tags: ["travel", "packable", "organization", "weekend"],
		basePrice: 28,
		sizes: ["One size"],
	},
	{
		department: "Home",
		categoryId: 401,
		collection: "Table Practice",
		types: ["Carafe", "Serving Bowl"],
		descriptors: ["Forma", "Dune", "Still", "Arc", "Field", "Ledge", "Morrow", "Stack", "Curve", "Ritual"],
		materials: ["glazed ceramic", "handblown glass", "stoneware", "brushed steel"],
		colors: [
			{ name: "Chalk", converted_name: "White", color_code: "#ece9e2" },
			{ name: "Smoke", converted_name: "Gray", color_code: "#777b7d" },
			{ name: "Amber", converted_name: "Orange", color_code: "#b47b3f" },
			{ name: "Ink", converted_name: "Black", color_code: "#1f2329" },
		],
		brands: ["Plain Form", "Stillroom", "Aster Works", "Common Field"],
		tags: ["table", "hosting", "handmade", "ritual"],
		basePrice: 38,
		sizes: ["One size"],
	},
	{
		department: "Home",
		categoryId: 402,
		collection: "Soft Landing",
		types: ["Throw", "Cushion"],
		descriptors: ["Cloud", "Grid", "Hearth", "Loom", "Quiet", "Fold", "Soft", "Horizon", "Woven", "Rest"],
		materials: ["washed linen", "organic cotton", "wool blend", "recycled boucle"],
		colors: [
			{ name: "Oat", converted_name: "Beige", color_code: "#d6c8aa" },
			{ name: "Rust", converted_name: "Orange", color_code: "#b8633e" },
			{ name: "Sage", converted_name: "Green", color_code: "#829783" },
			{ name: "Ink", converted_name: "Black", color_code: "#1f2329" },
		],
		brands: ["Stillroom", "Plain Form", "Common Field", "Morrow House"],
		tags: ["texture", "comfort", "home", "layering"],
		basePrice: 54,
		sizes: ["Small", "Medium", "Large"],
	},
	{
		department: "Home",
		categoryId: 403,
		collection: "Light & Form",
		types: ["Desk Lamp", "Candle Holder"],
		descriptors: ["Halo", "Beam", "Orbit", "Dome", "North", "Glow", "Arc", "Signal", "Still", "Focus"],
		materials: ["brushed aluminum", "powder-coated steel", "opal glass", "solid brass"],
		colors: [
			{ name: "Aluminum", converted_name: "Silver", color_code: "#a7aaad" },
			{ name: "Black", converted_name: "Black", color_code: "#26282c" },
			{ name: "Warm White", converted_name: "White", color_code: "#f1e6d2" },
			{ name: "Brass", converted_name: "Gold", color_code: "#b18c54" },
		],
		brands: ["Lumen", "Stillroom", "Aster Works", "Plain Form"],
		tags: ["lighting", "desk", "objects", "warm light"],
		basePrice: 62,
		sizes: ["One size"],
	},
	{
		department: "Desk & Tech",
		categoryId: 501,
		collection: "Clear Desk",
		types: ["Notebook", "Desk Tray"],
		descriptors: ["Index", "Ledger", "Daily", "Grid", "Field", "Focus", "Record", "Open", "Stack", "Mark"],
		materials: ["recycled paper", "vegetable-tanned leather", "powder-coated steel", "solid walnut"],
		colors: [
			{ name: "Navy", converted_name: "Blue", color_code: "#293b5b" },
			{ name: "Chalk", converted_name: "White", color_code: "#ece9e2" },
			{ name: "Rust", converted_name: "Orange", color_code: "#b8633e" },
			{ name: "Moss", converted_name: "Green", color_code: "#65745a" },
		],
		brands: ["Plain Form", "Common Field", "Aster Works", "Lumen"],
		tags: ["desk", "focus", "organization", "giftable"],
		basePrice: 22,
		sizes: ["One size"],
	},
	{
		department: "Desk & Tech",
		categoryId: 502,
		collection: "Quiet Signal",
		types: ["Desk Speaker", "Charging Dock"],
		descriptors: ["Mono", "Link", "Pulse", "Dock", "Wave", "Port", "Relay", "Tone", "Charge", "Loop"],
		materials: ["anodized aluminum", "soft-touch polymer", "recycled ABS", "woven textile"],
		colors: [
			{ name: "Charcoal", converted_name: "Gray", color_code: "#383c45" },
			{ name: "Chalk", converted_name: "White", color_code: "#ece9e2" },
			{ name: "Cobalt", converted_name: "Blue", color_code: "#3455b9" },
			{ name: "Coral", converted_name: "Red", color_code: "#d87866" },
		],
		brands: ["Lumen", "Aster Works", "Signal Studio", "Plain Form"],
		tags: ["audio", "power", "desk", "minimal"],
		basePrice: 46,
		sizes: ["One size"],
	},
	{
		department: "Wellness",
		categoryId: 601,
		collection: "Daily Reset",
		types: ["Bath Towel", "Body Brush"],
		descriptors: ["Steam", "Rinse", "Cloud", "Earth", "Soft", "Ritual", "Daily", "Calm", "Warm", "Care"],
		materials: ["organic cotton", "beechwood", "natural loofah", "linen terry"],
		colors: [
			{ name: "Oat", converted_name: "Beige", color_code: "#d6c8aa" },
			{ name: "Sage", converted_name: "Green", color_code: "#829783" },
			{ name: "Chalk", converted_name: "White", color_code: "#ece9e2" },
			{ name: "Clay", converted_name: "Orange", color_code: "#ad654c" },
		],
		brands: ["Stillroom", "Morrow House", "Common Field", "Plain Form"],
		tags: ["bath", "ritual", "self care", "texture"],
		basePrice: 18,
		sizes: ["One size"],
	},
	{
		department: "Wellness",
		categoryId: 602,
		collection: "Move Slowly",
		types: ["Yoga Mat", "Stretch Strap"],
		descriptors: ["Ground", "Flow", "Balance", "Open", "Range", "Still", "Pace", "Center", "Ease", "Form"],
		materials: ["natural rubber", "organic cotton", "recycled foam", "hemp canvas"],
		colors: [
			{ name: "Forest", converted_name: "Green", color_code: "#3f5947" },
			{ name: "Cobalt", converted_name: "Blue", color_code: "#3455b9" },
			{ name: "Clay", converted_name: "Orange", color_code: "#ad654c" },
			{ name: "Charcoal", converted_name: "Gray", color_code: "#383c45" },
		],
		brands: ["Groundwork", "Northline", "Stillroom", "Common Field"],
		tags: ["movement", "studio", "stretch", "active"],
		basePrice: 34,
		sizes: ["One size"],
	},
	{
		department: "Outdoor",
		categoryId: 701,
		collection: "Open Air",
		types: ["Camp Mug", "Picnic Blanket"],
		descriptors: ["Ember", "Field", "Camp", "Flint", "Pine", "Open", "Summit", "Trail", "Gather", "Ridge"],
		materials: ["enamel steel", "recycled wool", "stainless steel", "waxed canvas"],
		colors: [
			{ name: "Forest", converted_name: "Green", color_code: "#3f5947" },
			{ name: "Rust", converted_name: "Orange", color_code: "#b8633e" },
			{ name: "Navy", converted_name: "Blue", color_code: "#293b5b" },
			{ name: "Chalk", converted_name: "White", color_code: "#ece9e2" },
		],
		brands: ["Groundwork", "Northline", "Field Standard", "Common Field"],
		tags: ["camp", "picnic", "outside", "weekend"],
		basePrice: 26,
		sizes: ["One size"],
	},
	{
		department: "Outdoor",
		categoryId: 702,
		collection: "Weather Window",
		types: ["Rain Shell", "Wool Cap"],
		descriptors: ["Cloudbreak", "North", "Drift", "Storm", "Mist", "Shelter", "Weather", "Coast", "Layer", "Wind"],
		materials: ["recycled ripstop", "merino wool", "waxed cotton", "technical nylon"],
		colors: [
			{ name: "Cobalt", converted_name: "Blue", color_code: "#3455b9" },
			{ name: "Olive", converted_name: "Green", color_code: "#59664b" },
			{ name: "Charcoal", converted_name: "Gray", color_code: "#383c45" },
			{ name: "Coral", converted_name: "Red", color_code: "#d87866" },
		],
		brands: ["Northline", "Groundwork", "Field Standard", "Aster Works"],
		tags: ["weather", "layering", "wind", "outdoor"],
		basePrice: 64,
		sizes: ["S", "M", "L", "XL"],
	},
	{
		department: "Gifts",
		categoryId: 801,
		collection: "Good Things",
		types: ["Matchbox", "Small Vase"],
		descriptors: ["Little", "Bright", "Tiny", "Pocket", "Good", "Kind", "Daily", "Simple", "Lucky", "Small"],
		materials: ["soy wax", "glazed ceramic", "brass", "recycled glass"],
		colors: [
			{ name: "Coral", converted_name: "Red", color_code: "#d87866" },
			{ name: "Cobalt", converted_name: "Blue", color_code: "#3455b9" },
			{ name: "Chalk", converted_name: "White", color_code: "#ece9e2" },
			{ name: "Amber", converted_name: "Orange", color_code: "#b47b3f" },
		],
		brands: ["Stillroom", "Plain Form", "Morrow House", "Common Field"],
		tags: ["giftable", "under 50", "small joy", "host"],
		basePrice: 14,
		sizes: ["One size"],
	},
	{
		department: "Gifts",
		categoryId: 802,
		collection: "Open Door",
		types: ["Serving Board", "Linen Napkin Set"],
		descriptors: ["Gather", "Host", "Table", "Share", "Open", "Welcome", "Sunday", "Guest", "Common", "Pour"],
		materials: ["walnut", "linen", "olive wood", "stoneware"],
		colors: [
			{ name: "Natural", converted_name: "Brown", color_code: "#a9825a" },
			{ name: "Oat", converted_name: "Beige", color_code: "#d6c8aa" },
			{ name: "Forest", converted_name: "Green", color_code: "#3f5947" },
			{ name: "Ink", converted_name: "Black", color_code: "#1f2329" },
		],
		brands: ["Morrow House", "Stillroom", "Common Field", "Plain Form"],
		tags: ["hosting", "giftable", "table", "under 100"],
		basePrice: 48,
		sizes: ["One size"],
	},
];

function slugify(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function money(value: number) {
	return Math.round(value * 100) / 100;
}

// The first 512 products are the catalog represented by the frozen order
// archive. New products are appended after that watermark so existing product
// IDs, URLs, images, and order references remain stable as the catalog grows.
const ARCHIVED_PRODUCT_COUNT = 512;
const TOTAL_PRODUCT_COUNT = 512;
const INITIAL_GROUP_PRODUCT_COUNTS = groups.map((_group, groupIndex) => (groupIndex < 8 ? 29 : 28));

function createProduct(group: ProductGroup, groupIndex: number, localIndex: number, productIndex: number): Product {
	const edition = Math.floor(localIndex / (group.descriptors.length * group.types.length));
	const type = group.types[Math.floor(localIndex / group.descriptors.length) % group.types.length] ?? group.types[0];
	const descriptor = group.descriptors[localIndex % group.descriptors.length];
	const color = group.colors[(localIndex + groupIndex) % group.colors.length];
	const brand = group.brands[(localIndex + groupIndex) % group.brands.length];
	const material = group.materials[(localIndex + groupIndex) % group.materials.length];
	const id = 10_001 + productIndex;
	const productNumber = String(productIndex + 1).padStart(4, "0");
	const name = `${descriptor} ${color.name} ${type}${edition ? ` Edition ${edition + 1}` : ""}`;
	const listPrice = money(group.basePrice + (localIndex % 5) * 9 + groupIndex * 3);
	const onSale = (localIndex + groupIndex) % 7 === 0;
	const price = onSale ? money(listPrice * 0.8) : listPrice;
	const marginGroup = ((productIndex * 3 + groupIndex) % 5) + 1;
	const image = `${BASE_IMAGE}/product-${productNumber}.jpg`;
	const createdAt = productIndex < ARCHIVED_PRODUCT_COUNT
		? CREATED_AT - (ARCHIVED_PRODUCT_COUNT - productIndex) * DAY
		: CREATED_AT + (productIndex - ARCHIVED_PRODUCT_COUNT + 1) * DAY;

	return {
		id,
		name,
		slug: `${slugify(name)}-${id}`,
		description: `${name} by ${brand}, made from ${material} for the ${group.collection.toLowerCase()} collection. Designed to be used often, kept for a long time, and styled without much effort.`,
		price,
		list_price: listPrice,
		on_sale: onSale,
		image,
		url: `/product/${slugify(name)}-${id}`,
		categories: [group.categoryId],
		created_at: createdAt,
		brand,
		color: { ...color, image },
		reviews_amount: 18 + ((localIndex * 17 + groupIndex * 13) % 183),
		reviews_avg: money(4 + ((localIndex + groupIndex) % 10) / 10),
		material,
		size_options: group.sizes,
		collection: group.collection,
		season: ["Spring", "Summer", "Autumn", "Winter"][(localIndex + groupIndex) % 4],
		tags: [...group.tags.slice(0, 3), color.converted_name.toLowerCase()],
		stock_status: localIndex % 11 === 0 ? "low_stock" : "in_stock",
		inventory: 4 + ((localIndex * 29 + groupIndex * 11) % 96),
		is_featured: (localIndex + groupIndex) % 4 === 0,
		is_new: localIndex < 3,
		department: group.department,
		sku: `AWS-${String(id).padStart(5, "0")}`,
		margin_group: marginGroup,
	};
}

const archivedProducts = groups.flatMap((group, groupIndex) => {
	const groupProductCount = INITIAL_GROUP_PRODUCT_COUNTS[groupIndex] ?? 0;
	const groupOffset = INITIAL_GROUP_PRODUCT_COUNTS.slice(0, groupIndex).reduce((total, count) => total + count, 0);
	return Array.from({ length: groupProductCount }, (_, localIndex) => createProduct(group, groupIndex, localIndex, groupOffset + localIndex));
});

const additionalProductCount = Math.max(0, TOTAL_PRODUCT_COUNT - ARCHIVED_PRODUCT_COUNT);
const additionalProducts = Array.from({ length: additionalProductCount }, (_, extraIndex) => {
	const groupIndex = extraIndex % groups.length;
	const group = groups[groupIndex] ?? groups[0];
	const localIndex = (INITIAL_GROUP_PRODUCT_COUNTS[groupIndex] ?? 0) + Math.floor(extraIndex / groups.length);
	return createProduct(group, groupIndex, localIndex, ARCHIVED_PRODUCT_COUNT + extraIndex);
});

export const products: Product[] = [...archivedProducts, ...additionalProducts];

export const blogPages: BlogPage[] = [
	{
		id: 9001,
		type: "blog",
		slug: "the-case-for-fewer-better-things",
		url: "/blog/the-case-for-fewer-better-things",
		title: "The case for fewer, better things",
		text: "A good object earns its place slowly. We look at the details that make everyday pieces easier to live with, from a handle that sits naturally in the hand to a fabric that gets better with wear. At Awesome Store, we choose products for the repeat moments: the first coffee, the last train, the open door. The goal is not more stuff. It is a collection that works harder and asks less of you.",
		image: `${BASE_IMAGE}/product-0081.jpg`,
		keywords: ["design", "everyday", "objects", "living"],
		date: "2026-08-28",
	},
	{
		id: 9002,
		type: "blog",
		slug: "a-lightweight-kit-for-the-long-weekend",
		url: "/blog/a-lightweight-kit-for-the-long-weekend",
		title: "A lightweight kit for the long weekend",
		text: "The best travel list is short enough to remember. Start with one reliable layer, one flexible pair of shoes, and a bag that keeps the small stuff visible. Add something for the weather, a notebook for the in-between moments, and leave a little room for whatever you find along the way. Our long-weekend edit is built around that simple rhythm.",
		image: `${BASE_IMAGE}/product-0061.jpg`,
		keywords: ["travel", "packing", "weekend", "outdoors"],
		date: "2026-08-12",
	},
	{
		id: 9003,
		type: "blog",
		slug: "small-rituals-for-a-clearer-desk",
		url: "/blog/small-rituals-for-a-clearer-desk",
		title: "Small rituals for a clearer desk",
		text: "A clear desk is less about discipline than about giving every useful thing a home. We asked a few makers and writers about the objects that help them start, stop, and return to focused work. The answers were modest: a good light, one open notebook, a tray for the loose pieces, and a daily habit of leaving the next step visible.",
		image: `${BASE_IMAGE}/product-0121.jpg`,
		keywords: ["desk", "work", "focus", "ritual"],
		date: "2026-07-26",
	},
];

export function getCategoryBySlug(slug: string) {
	return categories.find((category) => category.slug === slug);
}

export function getProductBySlug(slug: string) {
	return products.find((product) => product.slug === slug);
}

export function getBlogPageBySlug(slug: string) {
	return blogPages.find((page) => page.slug === slug);
}

export function getCategoryTreeIds(categoryId: number): number[] {
	const category = categories.find((candidate) => candidate.id === categoryId);
	if (!category) return [];
	return [category.id, ...category.subcategories.flatMap((childId) => getCategoryTreeIds(childId))];
}

export function productsForCategory(categoryId: number) {
	const ids = new Set(getCategoryTreeIds(categoryId));
	return products.filter((product) => product.categories.some((id) => ids.has(id)));
}

export const topLevelCategories = categories.filter((category) => !category.parentId);
export const featuredProducts = products.filter((product) => product.is_featured).slice(0, 8);
export const newProducts = products.filter((product) => product.is_new).slice(0, 8);
