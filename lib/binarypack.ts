import { BufferBuilder } from "./bufferbuilder";

export type Packable =
	| null
	| undefined
	| string
	| number
	| boolean
	| Date
	| ArrayBuffer
	| Array<Packable>
	| { [key: string]: Packable }
	| ({ BYTES_PER_ELEMENT: number } & ArrayBufferView);
export type Unpackable =
	| null
	| undefined
	| string
	| number
	| boolean
	| ArrayBuffer
	| Array<Unpackable>
	| { [key: string]: Unpackable };

export function unpack<T extends Unpackable>(data: ArrayBuffer) {
	const unpacker = new Unpacker(data);
	return unpacker.unpack() as T;
}

export function pack(data: Packable) {
	const packer = new Packer();
	packer.pack(data);
	return packer.getBuffer();
}

class Unpacker {
	private index: number;
	private readonly dataBuffer: ArrayBuffer;
	private readonly dataView: Uint8Array;
	private readonly length: number;

	constructor(data: ArrayBuffer) {
		this.index = 0;
		this.dataBuffer = data;
		this.dataView = new Uint8Array(this.dataBuffer);
		this.length = this.dataBuffer.byteLength;
	}

	unpack(): Unpackable {
		const type = this.unpack_uint8();
		if (type < 0x80) {
			return type;
		} else if ((type ^ 0xe0) < 0x20) {
			return (type ^ 0xe0) - 0x20;
		}

		let size;
		if ((size = type ^ 0xa0) <= 0x0f) {
			return this.unpack_raw(size);
		} else if ((size = type ^ 0xb0) <= 0x0f) {
			return this.unpack_string(size);
		} else if ((size = type ^ 0x90) <= 0x0f) {
			return this.unpack_array(size);
		} else if ((size = type ^ 0x80) <= 0x0f) {
			return this.unpack_map(size);
		}

		switch (type) {
			case 0xc0:
				return null;
			case 0xc1:
				return undefined;
			case 0xc2:
				return false;
			case 0xc3:
				return true;
			case 0xca:
				return this.unpack_float();
			case 0xcb:
				return this.unpack_double();
			case 0xcc:
				return this.unpack_uint8();
			case 0xcd:
				return this.unpack_uint16();
			case 0xce:
				return this.unpack_uint32();
			case 0xcf:
				return this.unpack_uint64();
			case 0xd0:
				return this.unpack_int8();
			case 0xd1:
				return this.unpack_int16();
			case 0xd2:
				return this.unpack_int32();
			case 0xd3:
				return this.unpack_int64();
			case 0xd4:
				return undefined;
			case 0xd5:
				return undefined;
			case 0xd6:
				return undefined;
			case 0xd7:
				return undefined;
			case 0xd8:
				size = this.unpack_uint16();
				return this.unpack_string(size);
			case 0xd9:
				size = this.unpack_uint32();
				return this.unpack_string(size);
			case 0xda:
				size = this.unpack_uint16();
				return this.unpack_raw(size);
			case 0xdb:
				size = this.unpack_uint32();
				return this.unpack_raw(size);
			case 0xdc:
				size = this.unpack_uint16();
				return this.unpack_array(size);
			case 0xdd:
				size = this.unpack_uint32();
				return this.unpack_array(size);
			case 0xde:
				size = this.unpack_uint16();
				return this.unpack_map(size);
			case 0xdf:
				size = this.unpack_uint32();
				return this.unpack_map(size);
		}
	}

	unpack_uint8() {
		const byte = this.dataView[this.index] & 0xff;
		this.index++;
		return byte;
	}

	unpack_uint16() {
		const bytes = this.read(2);
		const uint16 = (bytes[0] & 0xff) * 256 + (bytes[1] & 0xff);
		this.index += 2;
		return uint16;
	}

	unpack_uint32() {
		const bytes = this.read(4);
		const uint32 =
			((bytes[0] * 256 + bytes[1]) * 256 + bytes[2]) * 256 + bytes[3];
		this.index += 4;
		return uint32;
	}

	unpack_uint64() {
		const bytes = this.read(8);
		const uint64 =
			((((((bytes[0] * 256 + bytes[1]) * 256 + bytes[2]) * 256 + bytes[3]) *
				256 +
				bytes[4]) *
				256 +
				bytes[5]) *
				256 +
				bytes[6]) *
				256 +
			bytes[7];
		this.index += 8;
		return uint64;
	}

	unpack_int8() {
		const uint8 = this.unpack_uint8();
		return uint8 < 0x80 ? uint8 : uint8 - (1 << 8);
	}

	unpack_int16() {
		const uint16 = this.unpack_uint16();
		return uint16 < 0x8000 ? uint16 : uint16 - (1 << 16);
	}

	unpack_int32() {
		const uint32 = this.unpack_uint32();
		return uint32 < 2 ** 31 ? uint32 : uint32 - 2 ** 32;
	}

	unpack_int64() {
		const uint64 = this.unpack_uint64();
		return uint64 < 2 ** 63 ? uint64 : uint64 - 2 ** 64;
	}

	unpack_raw(size: number) {
		if (this.length < this.index + size) {
			throw new Error(
				`BinaryPackFailure: index is out of range ${this.index} ${size} ${this.length}`,
			);
		}
		const buf = this.dataBuffer.slice(this.index, this.index + size);
		this.index += size;

		return buf;
	}

	unpack_string(size: number) {
		const bytes = this.read(size);
		let i = 0;
		let str = "";
		let c;
		let code;

		while (i < size) {
			c = bytes[i];
			// The length of a UTF-8 sequence is specified in the first byte:
			// 0xxxxxxx means length 1,
			// 110xxxxx means length 2,
			// 1110xxxx means length 3,
			// 11110xxx means length 4.
			// 10xxxxxx is for non-initial bytes.
			if (c < 0xa0) {
				// One-byte sequence: bits 0xxxxxxx
				code = c;
				i++;
			} else if ((c ^ 0xc0) < 0x20) {
				// Two-byte sequence: bits 110xxxxx 10xxxxxx
				code = ((c & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
				i += 2;
			} else if ((c ^ 0xe0) < 0x10) {
				// Three-byte sequence: bits 1110xxxx 10xxxxxx 10xxxxxx
				code =
					((c & 0x0f) << 12) |
					((bytes[i + 1] & 0x3f) << 6) |
					(bytes[i + 2] & 0x3f);
				i += 3;
			} else {
				// Four-byte sequence: bits 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
				code =
					((c & 0x07) << 18) |
					((bytes[i + 1] & 0x3f) << 12) |
					((bytes[i + 2] & 0x3f) << 6) |
					(bytes[i + 3] & 0x3f);
				i += 4;
			}
			str += String.fromCodePoint(code);
		}

		this.index += size;
		return str;
	}

	unpack_array(size: number) {
		const objects = new Array<Unpackable>(size);
		for (let i = 0; i < size; i++) {
			objects[i] = this.unpack();
		}
		return objects;
	}

	unpack_map(size: number) {
		const map: { [key: string]: Unpackable } = {};
		for (let i = 0; i < size; i++) {
			const key = this.unpack() as string;
			map[key] = this.unpack();
		}
		return map;
	}

	unpack_float() {
		const uint32 = this.unpack_uint32();
		const sign = uint32 >> 31;
		const exp = ((uint32 >> 23) & 0xff) - 127;
		const fraction = (uint32 & 0x7fffff) | 0x800000;
		return (sign === 0 ? 1 : -1) * fraction * 2 ** (exp - 23);
	}

	unpack_double() {
		const h32 = this.unpack_uint32();
		const l32 = this.unpack_uint32();
		const sign = h32 >> 31;
		const exp = ((h32 >> 20) & 0x7ff) - 1023;
		const hfrac = (h32 & 0xfffff) | 0x100000;
		const frac = hfrac * 2 ** (exp - 20) + l32 * 2 ** (exp - 52);
		return (sign === 0 ? 1 : -1) * frac;
	}

	read(length: number) {
		const j = this.index;
		if (j + length <= this.length) {
			return this.dataView.subarray(j, j + length);
		} else {
			throw new Error("BinaryPackFailure: read index out of range");
		}
	}
}

export class Packer {
	private _bufferBuilder = new BufferBuilder();
	private _textEncoder = new TextEncoder();

	getBuffer() {
		return this._bufferBuilder.toArrayBuffer();
	}

	pack(value: Packable) {
		if (typeof value === "string") {
			this.pack_string(value);
		} else if (typeof value === "number") {
			if (Math.floor(value) === value) {
				this.pack_integer(value);
			} else {
				this.pack_double(value);
			}
		} else if (typeof value === "boolean") {
			if (value === true) {
				this._bufferBuilder.append(0xc3);
			} else if (value === false) {
				this._bufferBuilder.append(0xc2);
			}
		} else if (value === undefined) {
			this._bufferBuilder.append(0xc0);
		} else if (typeof value === "object") {
			if (value === null) {
				this._bufferBuilder.append(0xc0);
			} else {
				const constructor = value.constructor;
				if (value instanceof Array) {
					this.pack_array(value);
				} else if (value instanceof ArrayBuffer) {
					this.pack_bin(new Uint8Array(value));
				} else if ("BYTES_PER_ELEMENT" in value) {
					const v = value as unknown as DataView;
					this.pack_bin(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
				} else if (value instanceof Date) {
					this.pack_string(value.toString());
				} else if (
					constructor == Object ||
					constructor.toString().startsWith("class")
				) {
					this.pack_object(value);
				} else {
					throw new Error(`Type "${constructor.toString()}" not yet supported`);
				}
			}
		} else {
			throw new Error(`Type "${typeof value}" not yet supported`);
		}
		this._bufferBuilder.flush();
	}

	pack_bin(blob: Uint8Array) {
		const length = blob.length;

		if (length <= 0x0f) {
			this.pack_uint8(0xa0 + length);
		} else if (length <= 0xffff) {
			this._bufferBuilder.append(0xda);
			this.pack_uint16(length);
		} else if (length <= 0xffffffff) {
			this._bufferBuilder.append(0xdb);
			this.pack_uint32(length);
		} else {
			throw new Error("Invalid length");
		}
		this._bufferBuilder.append_buffer(blob);
	}

	pack_string(str: string) {
		const encoded = this._textEncoder.encode(str);
		const length = encoded.length;

		if (length <= 0x0f) {
			this.pack_uint8(0xb0 + length);
		} else if (length <= 0xffff) {
			this._bufferBuilder.append(0xd8);
			this.pack_uint16(length);
		} else if (length <= 0xffffffff) {
			this._bufferBuilder.append(0xd9);
			this.pack_uint32(length);
		} else {
			throw new Error("Invalid length");
		}
		this._bufferBuilder.append_buffer(encoded);
	}

	pack_array(ary: Packable[]) {
		const length = ary.length;
		if (length <= 0x0f) {
			this.pack_uint8(0x90 + length);
		} else if (length <= 0xffff) {
			this._bufferBuilder.append(0xdc);
			this.pack_uint16(length);
		} else if (length <= 0xffffffff) {
			this._bufferBuilder.append(0xdd);
			this.pack_uint32(length);
		} else {
			throw new Error("Invalid length");
		}
		for (let i = 0; i < length; i++) {
			this.pack(ary[i]);
		}
	}

	pack_integer(num: number) {
		if (num >= -0x20 && num <= 0x7f) {
			this._bufferBuilder.append(num & 0xff);
		} else if (num >= 0x00 && num <= 0xff) {
			this._bufferBuilder.append(0xcc);
			this.pack_uint8(num);
		} else if (num >= -0x80 && num <= 0x7f) {
			this._bufferBuilder.append(0xd0);
			this.pack_int8(num);
		} else if (num >= 0x0000 && num <= 0xffff) {
			this._bufferBuilder.append(0xcd);
			this.pack_uint16(num);
		} else if (num >= -0x8000 && num <= 0x7fff) {
			this._bufferBuilder.append(0xd1);
			this.pack_int16(num);
		} else if (num >= 0x00000000 && num <= 0xffffffff) {
			this._bufferBuilder.append(0xce);
			this.pack_uint32(num);
		} else if (num >= -0x80000000 && num <= 0x7fffffff) {
			this._bufferBuilder.append(0xd2);
			this.pack_int32(num);
		} else if (num >= -0x8000000000000000 && num <= 0x7fffffffffffffff) {
			this._bufferBuilder.append(0xd3);
			this.pack_int64(num);
		} else if (num >= 0x0000000000000000 && num <= 0xffffffffffffffff) {
			this._bufferBuilder.append(0xcf);
			this.pack_uint64(num);
		} else {
			throw new Error("Invalid integer");
		}
	}

	pack_double(num: number) {
		let sign = 0;
		if (num < 0) {
			sign = 1;
			num = -num;
		}
		const exp = Math.floor(Math.log(num) / Math.LN2);
		const frac0 = num / 2 ** exp - 1;
		const frac1 = Math.floor(frac0 * 2 ** 52);
		const b32 = 2 ** 32;
		const h32 =
			(sign << 31) | ((exp + 1023) << 20) | ((frac1 / b32) & 0x0fffff);
		const l32 = frac1 % b32;
		this._bufferBuilder.append(0xcb);
		this.pack_int32(h32);
		this.pack_int32(l32);
	}

	pack_object(obj: { [key: string]: Packable }) {
		const keys = Object.keys(obj);
		const length = keys.length;
		if (length <= 0x0f) {
			this.pack_uint8(0x80 + length);
		} else if (length <= 0xffff) {
			this._bufferBuilder.append(0xde);
			this.pack_uint16(length);
		} else if (length <= 0xffffffff) {
			this._bufferBuilder.append(0xdf);
			this.pack_uint32(length);
		} else {
			throw new Error("Invalid length");
		}
		for (const prop in obj) {
			// eslint-disable-next-line no-prototype-builtins
			if (obj.hasOwnProperty(prop)) {
				this.pack(prop);
				this.pack(obj[prop]);
			}
		}
	}

	pack_uint8(num: number) {
		this._bufferBuilder.append(num);
	}

	pack_uint16(num: number) {
		this._bufferBuilder.append(num >> 8);
		this._bufferBuilder.append(num & 0xff);
	}

	pack_uint32(num: number) {
		const n = num & 0xffffffff;
		this._bufferBuilder.append((n & 0xff000000) >>> 24);
		this._bufferBuilder.append((n & 0x00ff0000) >>> 16);
		this._bufferBuilder.append((n & 0x0000ff00) >>> 8);
		this._bufferBuilder.append(n & 0x000000ff);
	}

	pack_uint64(num: number) {
		const high = num / 2 ** 32;
		const low = num % 2 ** 32;
		this._bufferBuilder.append((high & 0xff000000) >>> 24);
		this._bufferBuilder.append((high & 0x00ff0000) >>> 16);
		this._bufferBuilder.append((high & 0x0000ff00) >>> 8);
		this._bufferBuilder.append(high & 0x000000ff);
		this._bufferBuilder.append((low & 0xff000000) >>> 24);
		this._bufferBuilder.append((low & 0x00ff0000) >>> 16);
		this._bufferBuilder.append((low & 0x0000ff00) >>> 8);
		this._bufferBuilder.append(low & 0x000000ff);
	}

	pack_int8(num: number) {
		this._bufferBuilder.append(num & 0xff);
	}

	pack_int16(num: number) {
		this._bufferBuilder.append((num & 0xff00) >> 8);
		this._bufferBuilder.append(num & 0xff);
	}

	pack_int32(num: number) {
		this._bufferBuilder.append((num >>> 24) & 0xff);
		this._bufferBuilder.append((num & 0x00ff0000) >>> 16);
		this._bufferBuilder.append((num & 0x0000ff00) >>> 8);
		this._bufferBuilder.append(num & 0x000000ff);
	}

	pack_int64(num: number) {
		const high = Math.floor(num / 2 ** 32);
		const low = num % 2 ** 32;
		this._bufferBuilder.append((high & 0xff000000) >>> 24);
		this._bufferBuilder.append((high & 0x00ff0000) >>> 16);
		this._bufferBuilder.append((high & 0x0000ff00) >>> 8);
		this._bufferBuilder.append(high & 0x000000ff);
		this._bufferBuilder.append((low & 0xff000000) >>> 24);
		this._bufferBuilder.append((low & 0x00ff0000) >>> 16);
		this._bufferBuilder.append((low & 0x0000ff00) >>> 8);
		this._bufferBuilder.append(low & 0x000000ff);
	}
}
