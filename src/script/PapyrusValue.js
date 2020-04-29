const PapyrusBase = require('./PapyrusBase');

module.exports = class PapyrusValue extends PapyrusBase {
  constructor(type = 'null', value = 'None') {
    super();
    this.type = type;
    this.value = value;
  }

  toString() {
    if (this.type == 'string') {
      return JSON.stringify(this.value);
    } else {
      return this.value;
    }
  }

  static readPex(pex) {
    let type = pex.readUInt8();
    switch (type) {
      case 0:
        return new PapyrusValue();
      case 1:
        return new PapyrusValue('id', pex.readTableString());
      case 2:
        return new PapyrusValue('string', pex.readTableString());
      case 3:
        return new PapyrusValue('integer', pex.readInt32());
      case 4:
        return new PapyrusValue('float', pex.readFloat());
      case 5:
        return new PapyrusValue('boolean', pex.readUInt8() ? true : false);
    }
  }

  writePex(pex) {
    switch (this.type) {
      case 'id':
        pex.writeUInt8(1);
        pex.writeTableString(this.value);
        break;
      case 'string':
        pex.writeUInt8(2);
        pex.writeTableString(this.value);
        break;
      case 'integer':
        pex.writeUInt8(3);
        pex.writeInt32(this.value);
        break;
      case 'float':
        pex.writeUInt8(4);
        pex.writeFloat(this.value);
        break;
      case 'boolean':
        pex.writeUInt8(5);
        pex.writeUInt8(this.value ? 1 : 0);
        break;
      case 'null':
      default:
        pex.writeUInt8(0);
    }
  }

  getStrings() {
    if (this.type == 'string' || this.type == 'id') {
      return [this.value];
    } else {
      return [];
    }
  }
}
