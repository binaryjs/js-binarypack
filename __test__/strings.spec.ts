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

	/**
	 * A Javascript string with unpaired surrogates is not actually valid
	 * UTF-16, and so it cannot be round-tripped to UTF-8 and back.
	 * The recommended way to handle this is to replace each unpaired surrogate
	 * with \uFFFD (the "replacement character").
	 *
	 * Note a surrogate pair means two adjacent Javascript characters where the
	 * first is in the range \uD800 - \uDBFF and the second is in the
	 * range \uDC00 - \uDFFF.
	 * To be valid UTF-16, Javascript characters from these ranges must *only*
	 * appear in surrogate pairs. An *unpaired* surrogate means any such
	 * Javascript character that is not paired up properly.
	 *
	 * https://github.com/peers/js-binarypack/issues/11#issuecomment-1445129237
	 */
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
