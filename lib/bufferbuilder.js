const binaryFeatures = {};
binaryFeatures.useBlobBuilder = (() => {
	try {
		new Blob([]);
		return false;
	} catch (e) {
		return true;
	}
})();

binaryFeatures.useArrayBufferView =
	!binaryFeatures.useBlobBuilder &&
	(() => {
		try {
			return new Blob([new Uint8Array([])]).size === 0;
		} catch (e) {
			return true;
		}
	})();

export { binaryFeatures };
let BlobBuilder = module.exports.BlobBuilder;
if (typeof window !== "undefined") {
	BlobBuilder = module.exports.BlobBuilder =
		window.WebKitBlobBuilder ||
		window.MozBlobBuilder ||
		window.MSBlobBuilder ||
		window.BlobBuilder;
}

class BufferBuilder {
	constructor() {
		this._pieces = [];
		this._parts = [];
	}

	append(data) {
		if (typeof data === "number") {
			this._pieces.push(data);
		} else {
			this.flush();
			this._parts.push(data);
		}
	}

	flush() {
		if (this._pieces.length > 0) {
			let buf = new Uint8Array(this._pieces);
			if (!binaryFeatures.useArrayBufferView) {
				buf = buf.buffer;
			}
			this._parts.push(buf);
			this._pieces = [];
		}
	}

	getBuffer() {
		this.flush();
		if (binaryFeatures.useBlobBuilder) {
			const builder = new BlobBuilder();
			for (let i = 0, ii = this._parts.length; i < ii; i++) {
				builder.append(this._parts[i]);
			}
			return builder.getBlob();
		} else {
			return new Blob(this._parts);
		}
	}
}

export { BufferBuilder };
