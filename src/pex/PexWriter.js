module.exports = class PexWriter {
  constructor() {
    this.buffers = [];
    this.stringTable = {};
  }

  data() {
    let data = Buffer.concat(this.buffers);
    this.buffers = [data];
    return data;
  }

  writeUInt8(data) {
    let buf = Buffer.alloc(1);
    buf.writeUInt8(data);
    this.buffers.push(buf);
  }

  writeUInt16(data) {
    let buf = Buffer.alloc(2);
    buf.writeUInt16LE(data);
    this.buffers.push(buf);
  }

  writeUInt32(data) {
    let buf = Buffer.alloc(4);
    buf.writeUInt32LE(data);
    this.buffers.push(buf);
  }

  writeInt32(data) {
    let buf = Buffer.alloc(4);
    buf.writeInt32LE(data);
    this.buffers.push(buf);
  }

  writeUInt64(data) {
    let buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(data));
    this.buffers.push(buf);
  }

  writeFloat(data) {
    let buf = Buffer.alloc(4);
    buf.writeFloatLE(data);
    this.buffers.push(buf);
  }

  writeString(data) {
    this.writeUInt16(data.length);
    this.buffers.push(Buffer.from(data));
  }

  writeTableString(data) {
    this.writeUInt16(this.stringTable[data]);
  }
}
