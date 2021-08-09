const PapyrusBase = require('./PapyrusBase');
const PapyrusFunction = require('./PapyrusFunction');

module.exports = class PapyrusState extends PapyrusBase {
  constructor() {
    super();
    this.name = '';
    this.functions = {};
  }

  asPas() {
    return (
      `.state ${this.name}\n` +
      `${this._printTable(this.functions, 2)}\n` +
      `.endState`
    );
  }

  static readPex(pex) {
    let state = new PapyrusState();
    state.name = pex.readTableString();

    let count = pex.readUInt16();
    while (count--) {
      let func = PapyrusFunction.readPex(pex);
      state.functions[func.name] = func;
    }

    return state;
  }

  static readPas(tokens) {
    let state = new PapyrusState();

    tokens.expect('.state', false);
    if (tokens.peek() != '\n') {
      state.name = tokens.read();
    } else {
      state.name = '';
    }
    tokens.expectEOL();

    state.functions = {};
    while (tokens.peek() != '.endState') {
      let func = PapyrusFunction.readPas(tokens);
      state.functions[func.name] = func;
    }
    tokens.expect('.endState');

    return state;
  }

  writePex(pex) {
    pex.writeTableString(this.name);

    let functions = Object.values(this.functions);
    pex.writeUInt16(functions.length);
    functions.map((f) => f.writePex(pex));
  }

  getStrings() {
    return [this.name, ...this._getStringsFromTable(this.functions)];
  }
};
