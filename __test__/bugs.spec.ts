import { expect, describe, it } from "@jest/globals";

import { packAndUnpack } from "./util";

describe("Bugs", () => {
	describe("Objects", () => {
		it("replaces undefined with null ", async () => {
			expect(await packAndUnpack(undefined)).toBe(null);
		});
		it("throws on empty Uint8Array", async () => {
			expect(packAndUnpack(new Uint8Array())).rejects.toThrowError(
				"Invalid length",
			);
		});
	});
	describe("Numbers", () => {
		it("gives back wrong value on INT64_MAX ", async () => {
			expect(await packAndUnpack(0x7fffffffffffffff)).toBe(
				-9223372036854776000,
			);
		});
	});
});
