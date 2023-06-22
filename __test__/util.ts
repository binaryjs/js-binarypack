import { pack, Packable, unpack, Unpackable } from "../lib/binarypack";

export const packAndUnpack = async <T extends Unpackable>(data: Packable) => {
	const encoded = pack(data);
	return unpack<T>(encoded);
};
