import { expect, describe, it } from "@jest/globals";

import { packAndUnpack } from "./util";

describe("Binarypack", () => {
	it("should keep valid UTF-8", async () => {
		const values = [
			0,
			1,
			-1,
			//
			Math.PI,
			-Math.PI,
			//8 bit
			0x7f,
			0x0f,
			//16 bit
			0x7fff,
			0x0fff,
			//32 bit
			0x7fffffff,
			0x0fffffff,
			//64 bit
			// 0x7FFFFFFFFFFFFFFF,
			0x0fffffffffffffff,
		];
		// expect.assertions(values.length);
		for (const v of values) {
			expect(packAndUnpack(v)).toEqual(v);
		}
	});
});
