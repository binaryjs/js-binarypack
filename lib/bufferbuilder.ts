class BufferBuilder {
	private _pieces: number[];
	private readonly _parts: ArrayBufferView[];

	constructor() {
		this._pieces = [];
		this._parts = [];
	}

	append_buffer(data: ArrayBufferView) {
		this.flush();
		this._parts.push(data);
	}

	append(data: number) {
		this._pieces.push(data);
	}

	flush() {
		if (this._pieces.length > 0) {
			const buf = new Uint8Array(this._pieces);
			this._parts.push(buf);
			this._pieces = [];
		}
	}

	private encoder = new TextEncoder();

	public toArrayBuffer() {
		const buffer = [];
		for (const part of this._parts) {
			buffer.push(part);
		}
		return concatArrayBuffers(buffer).buffer;
	}
}

export { BufferBuilder };

function concatArrayBuffers(bufs: ArrayBufferView[]) {
	let size = 0;
	for (const buf of bufs) {
		size += buf.byteLength;
	}
	const result = new Uint8Array(size);
	let offset = 0;
	for (const buf of bufs) {
		const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
		result.set(view, offset);
		offset += buf.byteLength;
	}
	return result;
}
