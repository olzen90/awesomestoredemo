type CartItem = {
	id: number;
	name: string;
	price: number;
	image: string;
	url: string;
	quantity: number;
};

const CART_KEY = "awesome-store-cart";

function readCart(): CartItem[] {
	try {
		const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveCart(cart: CartItem[]) {
	localStorage.setItem(CART_KEY, JSON.stringify(cart));
	updateCartCount(cart);
	renderCart(cart);
}

function updateCartContext(cart: CartItem[]) {
	const context = document.querySelector<HTMLElement>("#cart-context");
	if (!context) return;
	const productIds = cart.map((item) => item.id).join(",");
	const items = cart.map((item) => ({ id: item.id, quantity: item.quantity, price: item.price }));
	context.dataset.cartIds = productIds;
	context.dataset.cartProductIds = productIds;
	context.dataset.cartItems = JSON.stringify(items);
}

function updateCartCount(cart = readCart()) {
	const count = cart.reduce((total, item) => total + item.quantity, 0);
	updateCartContext(cart);
	document.querySelectorAll<HTMLElement>("[data-cart-count]").forEach((element) => {
		element.textContent = String(count);
	});
}

function formatPrice(value: number) {
	return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);
}

function showToast(message: string) {
	const toast = document.querySelector<HTMLElement>("[data-toast]");
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add("show");
	window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function addToCart(button: HTMLElement) {
	const id = Number(button.dataset.productId);
	const cart = readCart();
	const existing = cart.find((item) => item.id === id);
	if (existing) {
		existing.quantity += 1;
	} else {
		cart.push({
			id,
			name: button.dataset.productName || "Awesome Store product",
			price: Number(button.dataset.productPrice || 0),
			image: button.dataset.productImage || "",
			url: button.dataset.productUrl || "/",
			quantity: 1,
		});
	}
	saveCart(cart);
	showToast(`${button.dataset.productName || "Product"} added to your bag`);
}

function renderCart(cart = readCart()) {
	const container = document.querySelector<HTMLElement>("[data-cart-items]");
	if (!container) return;
	const empty = document.querySelector<HTMLElement>("[data-cart-empty]");
	const totalElement = document.querySelector<HTMLElement>("[data-cart-total]");
	const subtotalElement = document.querySelector<HTMLElement>("[data-cart-subtotal]");
	const checkoutLink = document.querySelector<HTMLAnchorElement>("[data-checkout-link]");

	if (!cart.length) {
		container.innerHTML = "";
		empty?.removeAttribute("hidden");
		if (totalElement) totalElement.textContent = formatPrice(0);
		if (subtotalElement) subtotalElement.textContent = formatPrice(0);
		if (checkoutLink) checkoutLink.setAttribute("aria-disabled", "true");
		return;
	}

	empty?.setAttribute("hidden", "true");
	container.innerHTML = cart.map((item) => `
		<article class="cart-item" data-cart-item data-id="${item.id}">
			<img src="${item.image}" alt="${item.name}" width="96" height="96" />
			<div>
				<h2><a href="${item.url}">${item.name}</a></h2>
				<p>Ready to ship from Awesome Store</p>
				<div class="quantity-control" aria-label="Quantity for ${item.name}">
					<button type="button" data-change-quantity="-1" data-id="${item.id}" aria-label="Decrease quantity">−</button>
					<span>${item.quantity}</span>
					<button type="button" data-change-quantity="1" data-id="${item.id}" aria-label="Increase quantity">+</button>
				</div>
			</div>
			<div class="cart-item-total">
				<strong>${formatPrice(item.price * item.quantity)}</strong>
				<button class="text-button remove-button" type="button" data-remove-item data-id="${item.id}">Remove</button>
			</div>
		</article>
	`).join("");

	const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
	if (totalElement) totalElement.textContent = formatPrice(subtotal);
	if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
	if (checkoutLink) checkoutLink.removeAttribute("aria-disabled");
}

function changeQuantity(id: number, delta: number) {
	const cart = readCart();
	const item = cart.find((candidate) => candidate.id === id);
	if (!item) return;
	item.quantity += delta;
	saveCart(cart.filter((candidate) => candidate.quantity > 0));
}

function removeItem(id: number) {
	saveCart(readCart().filter((item) => item.id !== id));
	showToast("Item removed from your bag");
}

function escapeHtml(value: string) {
	return value.replace(/[&<>'"]/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"'": "&#039;",
		'"': "&quot;",
	}[character] || character));
}

function setupSearchFallback() {
	const results = document.querySelector<HTMLElement>("[data-search-results]");
	const catalogElement = document.querySelector<HTMLScriptElement>("#search-catalog");
	if (!results || !catalogElement) return;

	const products = JSON.parse(catalogElement.textContent || "[]") as Array<{ id: number; name: string; slug: string; image: string; price: number; brand: string; color: string }>;
	const query = new URLSearchParams(window.location.search).get("q")?.trim().toLowerCase() || "";
	const input = document.querySelector<HTMLInputElement>("[data-search-input]");
	if (input) input.value = query;
	const matches = query ? products.filter((product) => `${product.name} ${product.brand} ${product.color}`.toLowerCase().includes(query)) : products.slice(0, 8);
	const summary = document.querySelector<HTMLElement>("[data-search-summary]");
	if (summary) summary.textContent = query ? `${matches.length} result${matches.length === 1 ? "" : "s"} for “${query}”` : "A few places to start";
	results.innerHTML = matches.length ? matches.map((product) => `
		<article class="product-card">
			<a class="product-image-wrap" href="/product/${product.slug}" aria-label="View ${escapeHtml(product.name)}">
				<img src="${product.image}" alt="${escapeHtml(product.name)}" width="720" height="720" />
				<span class="image-arrow" aria-hidden="true">↗</span>
			</a>
			<div class="product-card-copy">
				<div class="product-meta-row"><span>${escapeHtml(product.brand)}</span><span>${escapeHtml(product.color)}</span></div>
				<h3><a href="/product/${product.slug}">${escapeHtml(product.name)}</a></h3>
				<div class="product-price-row"><strong>${formatPrice(product.price)}</strong></div>
			</div>
		</article>
	`).join("") : `<div class="cart-empty"><h2>No matches yet.</h2><p>Try a color, material, or product type.</p></div>`;
}

function setupSort() {
	const select = document.querySelector<HTMLSelectElement>("[data-sort-products]");
	const grid = document.querySelector<HTMLElement>("[data-product-grid]");
	if (!select || !grid) return;
	select.addEventListener("change", () => {
		const cards = [...grid.querySelectorAll<HTMLElement>("[data-product-card]")];
		cards.sort((a, b) => {
			if (select.value === "price-low") return Number(a.dataset.price) - Number(b.dataset.price);
			if (select.value === "price-high") return Number(b.dataset.price) - Number(a.dataset.price);
			if (select.value === "newest") return Number(b.dataset.createdAt) - Number(a.dataset.createdAt);
			return 0;
		});
		cards.forEach((card) => grid.append(card));
	});
}

document.addEventListener("click", (event) => {
	const target = event.target as HTMLElement;
	const addButton = target.closest<HTMLElement>("[data-add-to-basket]");
	if (addButton) addToCart(addButton);

	const quantityButton = target.closest<HTMLElement>("[data-change-quantity]");
	if (quantityButton) changeQuantity(Number(quantityButton.dataset.id), Number(quantityButton.dataset.changeQuantity));

	const removeButton = target.closest<HTMLElement>("[data-remove-item]");
	if (removeButton) removeItem(Number(removeButton.dataset.id));
});

document.addEventListener("DOMContentLoaded", () => {
	updateCartCount();
	renderCart();
	setupSearchFallback();
	setupSort();
});
