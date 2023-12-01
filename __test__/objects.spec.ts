import { expect, describe, it } from "@jest/globals";

import commit_data from "./data";
import { packAndUnpack } from "./util";

describe("Binarypack", () => {
	it("should keep objects intact", async () => {
		const values = commit_data;
		// expect.assertions(values.length);
		for (const v of values) {
			expect(packAndUnpack(v)).toEqual(v);
		}
	});
	it("should keep very large object intact", async () => {
		const v: { [key: number]: number } = {};
		for (let i = 0; i < 0xffff; i++) {
			v[i] = i;
		}
		expect(packAndUnpack(v)).toEqual(v);
	});
	it("should keep arrays of objects intact", async () => {
		expect(packAndUnpack(commit_data)).toEqual(commit_data);
	});
	it("should keep empty and very large arrays intact", async () => {
		const values = [[], Array(0xffff).fill(0)];
		// expect.assertions(values.length);
		for (const v of values) {
			expect(packAndUnpack(v)).toEqual(v);
		}
	});
	it("should keep null", async () => {
		expect(packAndUnpack(null)).toEqual(null);
	});

	it("should transfer Uint8Array views correctly", async () => {
		const arr = new Uint8Array(8);
		for (let i = 0; i < 8; i++) arr[i] = i;
		const v = new Uint8Array(arr.buffer, 4); // Half the array
		const result = packAndUnpack<ArrayBuffer>(v);

		expect(result).toBeInstanceOf(ArrayBuffer);
		if (result instanceof ArrayBuffer)
			expect(new Uint8Array(result)).toEqual(v);
	});

	it("should transfer Uint8Array as ArrayBuffer", async () => {
		const values = [
			new Uint8Array(),
			new Uint8Array([0]),
			new Uint8Array([0, 1, 2, 3, 4, 6, 7]),
			new Uint8Array([0, 1, 2, 3, 4, 6, 78, 9, 10, 11, 12, 13, 14, 15]),
			new Uint8Array([
				0, 1, 2, 3, 4, 6, 78, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22,
				23, 24, 25, 26, 27, 28, 30, 31,
			]),
		];
		// expect.assertions(values.length);
		for (const v of values) {
			const result = packAndUnpack<ArrayBuffer>(v);
			expect(result).toBeInstanceOf(ArrayBuffer);
			if (result instanceof ArrayBuffer)
				expect(new Uint8Array(result)).toEqual(v);
		}
	});

	it("should transfer Int32Array as ArrayBuffer", async () => {
		const values = [
			new Int32Array([0].map((x) => -x)),
			new Int32Array([0, 1, 2, 3, 4, 6, 7].map((x) => -x)),
			new Int32Array(
				[0, 1, 2, 3, 4, 6, 78, 9, 10, 11, 12, 13, 14, 15].map((x) => -x),
			),
			new Int32Array(
				[
					0, 1, 2, 3, 4, 6, 78, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21,
					22, 23, 24, 25, 26, 27, 28, 30, 31,
				].map((x) => -x),
			),
		];
		// expect.assertions(values.length);
		for (const v of values) {
			const result = packAndUnpack<ArrayBuffer>(v);
			expect(result).toBeInstanceOf(ArrayBuffer);
			if (result instanceof ArrayBuffer)
				expect(new Int32Array(result)).toEqual(v);
		}
	});

	it("should keep ArrayBuffers", async () => {
		const values = [
			new Uint8Array([]).buffer,
			new Uint8Array([0]).buffer,
			new Uint8Array([0, 1, 2, 3, 4, 6, 7]).buffer,
			new Uint8Array([0, 1, 2, 3, 4, 6, 78, 9, 10, 11, 12, 13, 14, 15]).buffer,
			new Uint8Array([
				0, 1, 2, 3, 4, 6, 78, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22,
				23, 24, 25, 26, 27, 28, 30, 31,
			]).buffer,
		];
		// expect.assertions(values.length);
		for (const v of values) {
			expect(packAndUnpack<ArrayBuffer>(v)).toEqual(v);
		}
	});

	it("should transfer Dates as String", async () => {
		const values = [new Date(), new Date(Date.UTC(1, 1, 1, 1, 1, 1, 1))];
		// expect.assertions(values.length);
		for (const v of values) {
			expect(packAndUnpack(v)).toEqual(v.toString());
		}
	});
});
