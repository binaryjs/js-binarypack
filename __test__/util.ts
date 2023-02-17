import { pack, unpack } from "../";

// jsdom doesn't support Blob yet
import "blob-polyfill";

export const packAndUnpack = async <T>(data: T) => {
	const encoded = pack(data);
	const onTheWire = await encoded.arrayBuffer();
	const decoded = unpack(onTheWire);
	return decoded;
};
