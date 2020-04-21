module.exports = class PexReader {
  constructor(buffer) {
    this.offset = 0;
    this.buffer = buffer;
    this.stringTable = {};
  }

  readUInt8() {
    this.offset += 1;
    return this.buffer.readUInt8(this.offset - 1);
  }

  readUInt16() {
    this.offset += 2;
    return this.buffer.readUInt16LE(this.offset - 2);
  }

  readUInt32() {
    this.offset += 4;
    return this.buffer.readUInt32LE(this.offset - 4);
  }

  readInt32() {
    this.offset += 4;
    return this.buffer.readInt32LE(this.offset - 4);
  }

  readUInt64() {
    this.offset += 8;
    return this.buffer.readBigUInt64LE(this.offset - 8);
  }

  readFloat() {
    this.offset += 4;
    return this.buffer.readFloatLE(this.offset - 4);
  }

  readString(stringify = false) {
    let length = this.readUInt16();
    this.offset += length;
    let string = this.buffer.toString('utf8', this.offset - length, this.offset);
    if (stringify)
      string = JSON.stringify(string);
    return string;
  }

  readTableString(stringify = false) {
    let index = this.readUInt16();
    let string = '';
    if (this.stringTable[index])
      string = this.stringTable[index];
    if (stringify)
      string = JSON.stringify(string);
    return string;
  }

  readValue() {
    let type = this.readUInt8();
    switch (type) {
      case 0:
        return 0;
      case 1:
        return this.readTableString();
      case 2:
        return JSON.stringify(this.readTableString());
      case 3:
        return this.readInt32();
      case 4:
        return this.readFloat();
      case 5:
        return this.readUInt8();
    }
  }
}