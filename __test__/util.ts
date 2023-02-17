import { pack, Packable, unpack, Unpackable } from "../lib/binarypack";

// jsdom doesn't support Blob yet
import "blob-polyfill";

export const packAndUnpack = async <T extends Unpackable>(data: Packable) => {
	const encoded = pack(data);
	const onTheWire = await encoded.arrayBuffer();
	return unpack<T>(onTheWire);
};
