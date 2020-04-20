const PapyrusBase = require('./PapyrusBase');
const PapyrusVariable = require('./PapyrusVariable');

module.exports = class PapyrusVariable extends PapyrusBase {
  constructor() {
    super();
    this.name = '';
    this.type = '';
    this.const = false;
    this.userFlags = 0;
    this.initialValue = 'None';
    this.docString = '';
  }

  asPas() {
    return `.variable ${this.name} ${this.type}${this.const ? ' const' : ''}\n` +
           `  .userFlags ${this.userFlags}\n` +
           `  .initialValue ${this.initialValue} ` +
           `${this.docString ? `\n  .docString ${this.docString}` : ''}\n` +
           `.endVariable`;
  }

  static readPex(pex, inStruct = false) {
    let variable = new PapyrusVariable();

    variable.name = pex.readTableString();
    variable.type = pex.readTableString();
    variable.userFlags = pex.readUInt32();
    variable.initialValue = pex.readValue();
    variable.const = pex.readUInt8() ? true : false;
    if (inStruct) variable.docString = pex.readTableString();

    return variable;
  }

  static readPas(tokens) {
    let variable = new PapyrusVariable();
    let [name, type] = tokens.read2('.variable', false);
    variable.name = name;
    variable.type = type;
    variable.const = tokens.maybe('const');
    tokens.expectEOL();

    variable.userFlags = tokens.read1('.userFlags');
    variable.initialValue = tokens.read1('.initialValue');
    if (tokens.maybe('.docString')) {
      variable.docString = tokens.read();
      tokens.expectEOL();
    }

    tokens.expect('.endVariable');

    return variable;
  }
}
