import { pack, Packable, unpack, Unpackable } from "../lib/binarypack";

export const packAndUnpack = <T extends Unpackable>(data: Packable) => {
	const encoded = pack(data);
	if (encoded instanceof Promise) {
		return encoded.then(unpack<T>);
	}
	return unpack<T>(encoded);
};
