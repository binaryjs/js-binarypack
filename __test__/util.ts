import { pack, unpack } from "../lib/binarypack";

// jsdom doesn't support Blob yet
import "blob-polyfill";

export const packAndUnpack = async <T>(data: T) => {
	const encoded = pack(data);
	const onTheWire = await encoded.arrayBuffer();
	return unpack(onTheWire);
};
