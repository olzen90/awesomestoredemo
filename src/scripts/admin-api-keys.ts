import { createDemoApiKey, DEMO_KEYS_STORAGE, parseDemoApiKeys, type DemoApiKey } from "../lib/demo-api-keys";

const form = document.querySelector<HTMLFormElement>("#create-key-form")!;
const nameInput = document.querySelector<HTMLInputElement>("#key-name")!;
const nameError = document.querySelector<HTMLParagraphElement>("#name-error")!;
const storageError = document.querySelector<HTMLParagraphElement>("#storage-error")!;
const list = document.querySelector<HTMLUListElement>("#key-list")!;
const reveal = document.querySelector<HTMLElement>("#new-key-panel")!;
const tokenInput = document.querySelector<HTMLInputElement>("#new-api-key")!;
const testRequest = document.querySelector<HTMLAnchorElement>("#test-request")!;
const copyStatus = document.querySelector<HTMLElement>("#copy-status")!;
const actionStatus = document.querySelector<HTMLElement>("#action-status")!;
const dialog = document.querySelector<HTMLDialogElement>("#revoke-dialog")!;
let keys: DemoApiKey[] = [];
let ready = false;
let revealedId: string | null = null;
let revokeId: string | null = null;
let revokeTrigger: HTMLButtonElement | null = null;

function hideToken() {
	reveal.hidden = true;
	tokenInput.value = "";
	testRequest.removeAttribute("href");
	copyStatus.textContent = "";
	revealedId = null;
}

function showStorageError(message: string) {
	storageError.textContent = message;
	storageError.hidden = false;
}

function save(next: DemoApiKey[]) {
	if (!ready) return false;
	try {
		localStorage.setItem(DEMO_KEYS_STORAGE, JSON.stringify(next));
		keys = next;
		storageError.hidden = true;
		return true;
	} catch {
		showStorageError("Your browser could not save this change. Allow local storage and try again. No key was created or revoked.");
		return false;
	}
}

function render() {
	list.replaceChildren();
	document.querySelector<HTMLElement>("#keys-empty")!.hidden = keys.length > 0;
	document.querySelector<HTMLElement>("#key-count")!.textContent = `${keys.filter((key) => !key.revokedAt).length} active`;
	for (const key of keys) {
		const row = document.createElement("li");
		row.className = "key-row";
		const info = document.createElement("div");
		const name = document.createElement("strong");
		name.textContent = key.name;
		const meta = document.createElement("div");
		meta.className = "key-meta";
		meta.textContent = `${key.prefix}… · Created ${new Date(key.createdAt).toLocaleString()}${key.revokedAt ? ` · Revoked ${new Date(key.revokedAt).toLocaleString()}` : ""}`;
		info.append(name, meta);
		const status = document.createElement("span");
		status.className = `key-badge${key.revokedAt ? " revoked" : ""}`;
		status.textContent = key.revokedAt ? "Revoked" : "Active";
		row.append(info, status);
		if (!key.revokedAt) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "secondary";
			button.textContent = "Revoke";
			button.setAttribute("aria-label", `Revoke ${key.name}`);
			button.addEventListener("click", () => {
				revokeId = key.id;
				revokeTrigger = button;
				document.querySelector<HTMLElement>("#revoke-description")!.textContent = `You are revoking “${key.name}”.`;
				dialog.returnValue = "cancel";
				dialog.showModal();
			});
			row.append(button);
		}
		list.append(row);
	}
}

function load() {
	try {
		keys = parseDemoApiKeys(localStorage.getItem(DEMO_KEYS_STORAGE));
		ready = true;
		storageError.hidden = true;
	} catch {
		ready = false;
		showStorageError("Saved demo keys could not be read. Allow local storage or use a fresh browser profile to try the demo. Existing saved data has not been overwritten.");
	}
	form.querySelector<HTMLButtonElement>("button[type=submit]")!.disabled = !ready;
	if (revealedId && !keys.some((key) => key.id === revealedId && !key.revokedAt)) hideToken();
	render();
}

nameInput.addEventListener("input", () => {
	nameError.hidden = true;
	nameInput.removeAttribute("aria-invalid");
});

form.addEventListener("submit", (event) => {
	event.preventDefault();
	if (!nameInput.value.trim() || nameInput.value.trim().length > 80) {
		nameError.textContent = "Enter a key name between 1 and 80 characters.";
		nameError.hidden = false;
		nameInput.setAttribute("aria-invalid", "true");
		nameInput.focus();
		return;
	}
	try {
		const { token, record } = createDemoApiKey(nameInput.value);
		if (!save([record, ...keys])) return;
		render();
		tokenInput.value = token;
		revealedId = record.id;
		const url = new URL(testRequest.dataset.url!, location.origin);
		url.searchParams.set("API_KEY", token);
		testRequest.href = url.toString();
		copyStatus.textContent = "";
		reveal.hidden = false;
		nameInput.value = "";
		actionStatus.textContent = `Created “${record.name}”. Copy the key from the panel above.`;
		document.querySelector<HTMLElement>("#new-key-heading")!.focus();
	} catch {
		showStorageError("A demo key could not be generated. Try again in a current browser using HTTPS or localhost.");
	}
});

document.querySelector("#copy-key")!.addEventListener("click", async () => {
	try {
		await navigator.clipboard.writeText(tokenInput.value);
		copyStatus.textContent = "API key copied. Paste it into your integration’s API key field.";
	} catch {
		tokenInput.focus();
		tokenInput.select();
		copyStatus.textContent = "Copy was unavailable. The key is selected; use your browser’s Copy command.";
	}
});

document.querySelector("#dismiss-key")!.addEventListener("click", () => {
	hideToken();
	actionStatus.textContent = "Key saved. Use your copied key with API_KEY in the integration. Create a new key if you lose it.";
	nameInput.focus();
});

dialog.addEventListener("close", () => {
	if (dialog.returnValue === "confirm" && revokeId) {
		const key = keys.find((entry) => entry.id === revokeId);
		if (key && !key.revokedAt && save(keys.map((entry) => entry.id === revokeId ? { ...entry, revokedAt: new Date().toISOString() } : entry))) {
			if (revealedId === revokeId) hideToken();
			render();
			actionStatus.textContent = `“${key.name}” was revoked in this browser. Static API authentication remains simulated.`;
			nameInput.focus();
		} else revokeTrigger?.focus();
	} else revokeTrigger?.focus();
	revokeId = null;
});

window.addEventListener("storage", (event) => {
	if (event.key === DEMO_KEYS_STORAGE || event.key === null) load();
});
window.addEventListener("pagehide", hideToken);
load();
