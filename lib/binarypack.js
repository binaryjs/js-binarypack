BinaryPack = {
  parse: function(data){
    var parser = new BinaryPack.Parser(data);
    return parser.parse();
  },
  blobify: function(data, type){
    var stringifier = new BinaryPack.Blobifier();
    var builder = stringifier.blobify(data);
    if (type === 'blob' || type === undefined) {
      return builder.getBlob();
    } else {
      throw new Error('Type "' + type + '" not yet implemented');
    }
  }
};

BinaryPack.Parser = function(data){
  // Data is ArrayBuffer
  this.index = 0;
  this.dataBuffer = data;
  this.dataView = new Uint8Array(this.dataBuffer);
  this.length = this.dataBuffer.byteLength;
}


BinaryPack.Parser.prototype.parse = function(){
  var type = this.parse_uint8();
  if (type < 0x80){
    var positive_fixnum = type;
    return positive_fixnum;
  } else if ((type ^ 0xe0) < 0x20){
    var negative_fixnum = (type ^ 0xe0) - 0x20;
    return negative_fixnum;
  }
  var size;
  if ((size = type ^ 0xa0) <= 0x0f){
    return this.parse_raw(size);
  } else if ((size = type ^ 0xb0) <= 0x0f){
    return this.parse_string(size);
  } else if ((size = type ^ 0x90) <= 0x0f){
    return this.parse_array(size);
  } else if ((size = type ^ 0x80) <= 0x0f){
    return this.parse_map(size);
  }
  switch(type){
    case 0xc0:
      return null;
    case 0xc1:
      return undefined;
    case 0xc2:
      return false;
    case 0xc3:
      return true;
    case 0xca:
      return this.parse_float();
    case 0xcb:
      return this.parse_double();
    case 0xcc:
      return this.parse_uint8();
    case 0xcd:
      return this.parse_uint16();
    case 0xce:
      return this.parse_uint32();
    case 0xcf:
      return this.parse_uint64();
    case 0xd0:
      return this.parse_int8();
    case 0xd1:
      return this.parse_int16();
    case 0xd2:
      return this.parse_int32();
    case 0xd3:
      return this.parse_int64();
    case 0xd4:
      return undefined;
    case 0xd5:
      return undefined;
    case 0xd6:
      return undefined;
    case 0xd7:
      return undefined;
    case 0xd8:
      size = this.parse_uint16();
      return this.parse_string(size);
    case 0xd9:
      size = this.parse_uint32();
      return this.parse_string(size);
    case 0xda:
      size = this.parse_uint16();
      return this.parse_raw(size);
    case 0xdb:
      size = this.parse_uint32();
      return this.parse_raw(size);
    case 0xdc:
      size = this.parse_uint16();
      return this.parse_array(size);
    case 0xdd:
      size = this.parse_uint32();
      return this.parse_array(size);
    case 0xde:
      size = this.parse_uint16();
      return this.parse_map(size);
    case 0xdf:
      size = this.parse_uint32();
      return this.parse_map(size);
  }
}

BinaryPack.Parser.prototype.parse_uint8 = function(){
  var byte = this.dataView[this.index] & 0xff;
  this.index++;
  return byte;
};

BinaryPack.Parser.prototype.parse_uint16 = function(){
  var bytes = this.read(2);
  var uint16 =
    ((bytes[0] & 0xff) * 256) + (bytes[1] & 0xff);
  this.index += 2;
  return uint16;
}

BinaryPack.Parser.prototype.parse_uint32 = function(){
  var bytes = this.read(4);
  var uint32 =
     ((bytes[0]  * 256 +
       bytes[1]) * 256 +
       bytes[2]) * 256 +
       bytes[3];
  this.index += 4;
  return uint32;
}

BinaryPack.Parser.prototype.parse_uint64 = function(){
  var bytes = this.read(8);
  var uint64 =
   ((((((bytes[0]  * 256 +
       bytes[1]) * 256 +
       bytes[2]) * 256 +
       bytes[3]) * 256 +
       bytes[4]) * 256 +
       bytes[5]) * 256 +
       bytes[6]) * 256 +
       bytes[7];
  this.index += 8;
  return uint64;
}


BinaryPack.Parser.prototype.parse_int8 = function(){
  var uint8 = this.parse_uint8();
  return (uint8 < 0x80 ) ? uint8 : uint8 - (1 << 8);
};

BinaryPack.Parser.prototype.parse_int16 = function(){
  var uint16 = this.parse_uint16();
  return (uint16 < 0x8000 ) ? uint16 : uint16 - (1 << 16);
}

BinaryPack.Parser.prototype.parse_int32 = function(){
  var uint32 = this.parse_uint32();
  return (uint32 < Math.pow(2, 31) ) ? uint32 :
    uint32 - Math.pow(2, 32);
}

BinaryPack.Parser.prototype.parse_int64 = function(){
  var uint64 = this.parse_uint64();
  return (uint64 < Math.pow(2, 63) ) ? uint64 :
    uint64 - Math.pow(2, 64);
}

BinaryPack.Parser.prototype.parse_raw = function(size){
  if ( this.length < this.index + size){
    throw new Error('BinaryPackFailure: index is out of range'
      + ' ' + this.index + ' ' + size + ' ' + this.length);
  }
  var buf = this.dataBuffer.slice(this.index, this.index + size);
  this.index += size;
  
    //buf = util.bufferToString(buf);
  
  return buf;
}

BinaryPack.Parser.prototype.parse_string = function(size){
  var bytes = this.read(size);
  var i = 0, str = "", c, code;
  while(i < size){
    c = bytes[i];
    if ( c < 128){
      str += String.fromCharCode(c);
      i++;
    } else if ((c ^ 0xc0) < 32){
      code = ((c ^ 0xc0) << 6) | (bytes[i+1] & 63);
      str += String.fromCharCode(code);
      i += 2;
    } else {
      code = ((c & 15) << 12) | ((bytes[i+1] & 63) << 6) |
        (bytes[i+2] & 63);
      str += String.fromCharCode(code);
      i += 3;
    }
  }
  this.index += size;
  return str;
}

BinaryPack.Parser.prototype.parse_array = function(size){
  var objects = new Array(size);
  for(var i = 0; i < size ; i++){
    objects[i] = this.parse();
  }
  return objects;
}

BinaryPack.Parser.prototype.parse_map = function(size){
  var map = {};
  for(var i = 0; i < size ; i++){
    var key  = this.parse();
    var value = this.parse();
    map[key] = value;
  }
  return map;
}

BinaryPack.Parser.prototype.parse_float = function(){
  var uint32 = this.parse_uint32();
  var sign = uint32 >> 31;
  var exp  = ((uint32 >> 23) & 0xff) - 127;
  var fraction = ( uint32 & 0x7fffff ) | 0x800000;
  return (sign == 0 ? 1 : -1) *
    fraction * Math.pow(2, exp - 23);
}

BinaryPack.Parser.prototype.parse_double = function(){
  var h32 = this.parse_uint32();
  var l32 = this.parse_uint32();
  var sign = h32 >> 31;
  var exp  = ((h32 >> 20) & 0x7ff) - 1023;
  var hfrac = ( h32 & 0xfffff ) | 0x100000;
  var frac = hfrac * Math.pow(2, exp - 20) +
    l32   * Math.pow(2, exp - 52);
  return (sign == 0 ? 1 : -1) * frac;
}

BinaryPack.Parser.prototype.read = function(length){
  var j = this.index;
  if (j + length <= this.length) {
    return this.dataView.subarray(j, j + length);
  } else {
    throw new Error('BinaryPackFailure: read index out of range');
  }
}
  
BinaryPack.Blobifier = function(){
  var BufferBuilder = WebKitBlobBuilder || MozBlobBuilder || MSBlobBuilder;
  this.pieces = [];
  this.blob = new BufferBuilder();
}

BinaryPack.Blobifier.prototype.blobify = function(value){
  var type = typeof(value);
  if (type == 'string'){
    this.blobify_string(value);
  } else if (type == "number"){
    if (Math.floor(value) === value){
      this.blobify_integer(value);
    } else{
      this.blobify_double(value);
    }
  } else if (type == 'boolean'){
    if (value === true){
      this.pieces.push(0xc3);
    } else if (value === false){
      this.pieces.push(0xc2);
    }
  } else if (type == 'undefined'){
    this.pieces.push(0xc0);
  } else if (type == 'object'){
    if (value === null){
      this.pieces.push(0xc0);
    } else {
      var constructor = value.constructor;
      if (constructor == Array){
        this.blobify_array(value);
      } else if (constructor == ArrayBuffer || constructor == Blob){
        this.blobify_bin(value);
      } else if (constructor == Object){
        this.blobify_object(value);
      } else if (constructor == Date){
        this.blobify_string(value.toString());
      } else if (typeof value.toBinaryPack == 'function'){
        this.flush();
        this.blob.append(value.toBinaryPack());
      } else {
        throw new Error('Type "' + value + '" not yet supported');
      }
    }
  }
  this.flush();
  return this.blob;
}

BinaryPack.Blobifier.prototype.flush = function(){
  if (this.pieces.length > 0) {    
    var buf = (new Uint8Array(this.pieces)).buffer;
    this.blob.append(buf);
    this.pieces = [];
  }
}

BinaryPack.Blobifier.prototype.blobify_bin = function(blob){
  var length = blob.length || blob.byteLength || blob.size;
  if (length <= 0x1f){
    this.blobify_uint8(0xa0 + length);
  } else if (length <= 0xffff){
    this.pieces.push(0xda) ;
    this.blobify_uint16(length);
  } else if (length <= 0xffffffff){
    this.pieces.push(0xdb);
    this.blobify_uint32(length);
  } else{
    throw new Error('Invalid length');
    return;
  }
  this.flush();
  this.blob.append(blob);
}

BinaryPack.Blobifier.prototype.blobify_string = function(str){
  var length = str.length;
  if (length <= 0x1f){
    this.blobify_uint8(0xb0 + length);
  } else if (length <= 0xffff){
    this.pieces.push(0xd8) ;
    this.blobify_uint16(length);
  } else if (length <= 0xffffffff){
    this.pieces.push(0xd9);
    this.blobify_uint32(length);
  } else{
    throw new Error('Invalid length');
    return;
  }
  this.flush();
  this.blob.append(str);
}

BinaryPack.Blobifier.prototype.blobify_array = function(ary){
  var length = ary.length;
  if (length <= 0x0f){
    this.blobify_uint8(0x90 + length);
  } else if (length <= 0xffff){
    this.pieces.push(0xdc)
    this.blobify_uint16(length);
  } else if (length <= 0xffffffff){
    this.pieces.push(0xdd);
    this.blobify_uint32(length);
  } else{
    throw new Error('Invalid length');
  }
  for(var i = 0; i < length ; i++){
    this.blobify(ary[i]);
  }
}

BinaryPack.Blobifier.prototype.blobify_integer = function(num){
  if ( -0x20 <= num && num <= 0x7f){
    this.pieces.push(num & 0xff);
  } else if (0x00 <= num && num <= 0xff){
    this.pieces.push(0xcc);
    this.blobify_uint8(num);
  } else if (-0x80 <= num && num <= 0x7f){
    this.pieces.push(0xd0);
    this.blobify_int8(num);
  } else if ( 0x0000 <= num && num <= 0xffff){
    this.pieces.push(0xcd);
    this.blobify_uint16(num);
  } else if (-0x8000 <= num && num <= 0x7fff){
    this.pieces.push(0xd1);
    this.blobify_int16(num);
  } else if ( 0x00000000 <= num && num <= 0xffffffff){
    this.pieces.push(0xce);
    this.blobify_uint32(num);
  } else if (-0x80000000 <= num && num <= 0x7fffffff){
    this.pieces.push(0xd2);
    this.blobify_int32(num);
  } else if (-0x8000000000000000 <= num && num <= 0x7FFFFFFFFFFFFFFF){
    this.pieces.push(0xd3);
    this.blobify_int64(num);
  } else if (0x0000000000000000 <= num && num <= 0xFFFFFFFFFFFFFFFF){
    this.pieces.push(0xcf);
    this.blobify_uint64(num);
  } else{
    throw new Error('Invalid integer');
  }
}

BinaryPack.Blobifier.prototype.blobify_double = function(num){
  var sign = 0;
  if (num < 0){
    sign = 1;
    num = -num;
  }
  var exp  = Math.floor(Math.log(num) / Math.LN2);
  var frac0 = num / Math.pow(2, exp) - 1;
  var frac1 = Math.floor(frac0 * Math.pow(2, 52));
  var b32   = Math.pow(2, 32);
  var h32 = (sign << 31) | ((exp+1023) << 20) |
      (frac1 / b32) & 0x0fffff;
  var l32 = frac1 % b32;
  this.pieces.push(0xcb);
  this.blobify_int32(h32);
  this.blobify_int32(l32);
}

BinaryPack.Blobifier.prototype.blobify_object = function(obj){
  var keys = Object.keys(obj);
  var length = keys.length;
  if (length <= 0x0f){
    this.blobify_uint8(0x80 + length);
  } else if (length <= 0xffff){
    this.pieces.push(0xde);
    this.blobify_uint16(length);
  } else if (length <= 0xffffffff){
    this.pieces.push(0xdf);
    this.blobify_uint32(length);
  } else{
    throw new Error('Invalid length');
  }
  for(var prop in obj){
    if (obj.hasOwnProperty(prop)){
      this.blobify(prop);
      this.blobify(obj[prop]);
    }
  }
}

BinaryPack.Blobifier.prototype.blobify_uint8 = function(num){
  this.pieces.push(num);
}

BinaryPack.Blobifier.prototype.blobify_uint16 = function(num){
  this.pieces.push(num >> 8);
  this.pieces.push(num & 0xff);
}

BinaryPack.Blobifier.prototype.blobify_uint32 = function(num){
  var n = num & 0xffffffff;
  this.pieces.push((n & 0xff000000) >>> 24);
  this.pieces.push((n & 0x00ff0000) >>> 16);
  this.pieces.push((n & 0x0000ff00) >>>  8);
  this.pieces.push((n & 0x000000ff));
}

BinaryPack.Blobifier.prototype.blobify_uint64 = function(num){
  var high = num / Math.pow(2, 32);
  var low  = num % Math.pow(2, 32);
  this.pieces.push((high & 0xff000000) >>> 24);
  this.pieces.push((high & 0x00ff0000) >>> 16);
  this.pieces.push((high & 0x0000ff00) >>>  8);
  this.pieces.push((high & 0x000000ff));
  this.pieces.push((low  & 0xff000000) >>> 24);
  this.pieces.push((low  & 0x00ff0000) >>> 16);
  this.pieces.push((low  & 0x0000ff00) >>>  8);
  this.pieces.push((low  & 0x000000ff));
}

BinaryPack.Blobifier.prototype.blobify_int8 = function(num){
  this.pieces.push(num & 0xff);
}

BinaryPack.Blobifier.prototype.blobify_int16 = function(num){
  this.pieces.push((num & 0xff00) >> 8);
  this.pieces.push(num & 0xff);
}

BinaryPack.Blobifier.prototype.blobify_int32 = function(num){
  this.pieces.push((num >>> 24) & 0xff);
  this.pieces.push((num & 0x00ff0000) >>> 16);
  this.pieces.push((num & 0x0000ff00) >>> 8);
  this.pieces.push((num & 0x000000ff));
}

BinaryPack.Blobifier.prototype.blobify_int64 = function(num){
  var high = Math.floor(num / Math.pow(2, 32));
  var low  = num % Math.pow(2, 32);
  this.pieces.push((high & 0xff000000) >>> 24);
  this.pieces.push((high & 0x00ff0000) >>> 16);
  this.pieces.push((high & 0x0000ff00) >>>  8);
  this.pieces.push((high & 0x000000ff));
  this.pieces.push((low  & 0xff000000) >>> 24);
  this.pieces.push((low  & 0x00ff0000) >>> 16);
  this.pieces.push((low  & 0x0000ff00) >>>  8);
  this.pieces.push((low  & 0x000000ff));
}
