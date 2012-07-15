var BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;

function BufferBuilder(){
  this._pieces = [];
  this._parts = [];
}

BufferBuilder.prototype.append = function(data) {
  if(typeof data === 'number') {
    this._pieces.push(data);
  } else {
    this._flush();
    this._parts.push(data);
  }
};

BufferBuilder.prototype._flush = function() {
  if (this._pieces.length > 0) {    
    var buf = new Uint8Array(this._pieces);
    this._parts.push(buf);
    this._pieces = [];
  }
};

BufferBuilder.prototype.getBuffer = function() {
  this._flush();
  var builder = new BlobBuilder();
  for(var i = 0, ii = this._parts.length; i < ii; i++) {
    builder.append(this._parts[i]);
  }
  return builder.getBlob();
};
