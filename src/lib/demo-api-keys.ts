export const DEMO_KEYS_STORAGE = "awesome-store-demo-api-keys-v1";
export type DemoApiKey = {
	id: string;
	name: string;
	prefix: string;
	createdAt: string;
	revokedAt: string | null;
};

export function createDemoApiKey(name: string) {
	const trimmed = name.trim();
	if (!trimmed || trimmed.length > 80) throw new Error("Enter a key name between 1 and 80 characters.");
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	const token = `aws_demo_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
	const record: DemoApiKey = { id: crypto.randomUUID(), name: trimmed, prefix: token.slice(0, 19), createdAt: new Date().toISOString(), revokedAt: null };
	return { token, record };
}

export function parseDemoApiKeys(value: string | null): DemoApiKey[] {
	if (value === null) return [];
	const records: unknown = JSON.parse(value);
	if (!Array.isArray(records) || !records.every((record) => record &&
		typeof record.id === "string" && typeof record.name === "string" &&
		typeof record.prefix === "string" && typeof record.createdAt === "string" &&
		Number.isFinite(Date.parse(record.createdAt)) &&
		(record.revokedAt === null || (typeof record.revokedAt === "string" && Number.isFinite(Date.parse(record.revokedAt)))))) {
		throw new Error("Saved demo keys could not be read.");
	}
	// Persist and read only metadata, never the complete generated key.
	return records.map(({ id, name, prefix, createdAt, revokedAt }) => ({ id, name, prefix, createdAt, revokedAt }));
}
