class BufferBuilder {
	private _pieces: any[];
	private readonly _parts: any[];
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
			const buf = new Uint8Array(this._pieces);
			this._parts.push(buf);
			this._pieces = [];
		}
	}

	getBuffer() {
		this.flush();
		return new Blob(this._parts);
	}
}

export { BufferBuilder };
