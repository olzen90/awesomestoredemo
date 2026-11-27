import assert from "node:assert/strict";
import test from "node:test";
import { createDemoApiKey, parseDemoApiKeys } from "../../src/lib/demo-api-keys.ts";

test("creates unique demo tokens while retaining only display metadata", () => {
	const first = createDemoApiKey("  Clerk integration  ");
	const second = createDemoApiKey("Clerk integration");
	assert.match(first.token, /^aws_demo_[a-f0-9]{48}$/);
	assert.notEqual(first.token, second.token);
	assert.notEqual(first.record.id, second.record.id);
	assert.equal(first.record.name, "Clerk integration");
	assert(first.token.startsWith(first.record.prefix));
	assert(!JSON.stringify(first.record).includes(first.token));
	assert.equal(first.record.revokedAt, null);
});

test("rejects missing or overlong names", () => {
	for (const name of ["", "  ", "a".repeat(81)]) assert.throws(() => createDemoApiKey(name));
});

test("round-trips metadata and revocation without retaining full credentials", () => {
	const { token, record } = createDemoApiKey("Python importer");
	const revoked = { ...record, revokedAt: new Date().toISOString(), token };
	const parsed = parseDemoApiKeys(JSON.stringify([revoked]));
	assert.equal(parsed[0].revokedAt, revoked.revokedAt);
	assert(!JSON.stringify(parsed).includes(token));
	assert.deepEqual(parseDemoApiKeys(null), []);
});

test("rejects malformed storage instead of silently overwriting it", () => {
	for (const stored of ["bad json", "{}", "[null]", '[{"createdAt":"invalid"}]']) assert.throws(() => parseDemoApiKeys(stored));
});
