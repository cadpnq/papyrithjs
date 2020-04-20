const PapyrusBase = require('./PapyrusBase');
const PapyrusVariable = require('./PapyrusVariable');

module.exports = class PapyrusStruct extends PapyrusBase {
  constructor() {
    super();
    this.name = '';
    this.members = {};
  }

  asPas() {
    return `.struct ${this.name}\n` +
          `${this._printTable(this.members, 2)}\n` +
          `.endStruct`;
  }

  static readPex(pex) {
    let struct = new PapyrusStruct();

    struct.name = pex.readTableString();

    let count = pex.readUInt16();
    while (count--) {
      let variable = PapyrusVariable.readPex(pex, true);
      struct.members[variable.name] = variable;
    }

    return struct;
  }

  static readPas(tokens) {
    let struct = new PapyrusStruct();
    struct.name = tokens.read1('.struct');

    while (tokens.peek() != '.endStruct') {
      let member = PapyrusVariable.readPas(tokens, true);
      struct.members[member.name] = member;
    }
    tokens.expect('.endStruct');

    return struct;
  }
}
