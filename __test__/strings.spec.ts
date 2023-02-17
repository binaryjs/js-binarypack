import { expect, describe, it } from "@jest/globals";

import { packAndUnpack } from "./util";

describe("Binarypack", () => {
	it("should keep valid UTF-8", async () => {
		const values = [
			"",
			"hello",
			"café",
			"中文",
			"broccoli🥦līp𨋢grin😃ok",
			"\u{10ffff}",
		];
		expect.assertions(values.length);
		for (const v of values) {
			expect(await packAndUnpack(v)).toEqual(v);
		}
	});
	it("should replace unpaired surrogates", async () => {
		const v = "un\ud800paired\udfffsurrogates";
		const expected = v.replace(
			/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g,
			"\ufffd",
		);

		expect(await packAndUnpack(v)).toEqual(expected);
	});

	it("should encode very large strings", async () => {
		const chunk = "ThisIsÁTèstString";
		const v = chunk.repeat(1000);

		expect(await packAndUnpack(v)).toEqual(v);
	});
});
