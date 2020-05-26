const PapyrusBase = require('./PapyrusBase');
const PapyrusValue = require('./PapyrusValue');
const PapyrusVariable = require('./PapyrusVariable');

module.exports = class PapyrusVariable extends PapyrusBase {
  constructor(inStruct = false) {
    super();
    this.name = '';
    this.type = '';
    this.const = false;
    this.userFlags = 0;
    this.initialValue = 'None';
    this.docString = '';
    this.inStruct = inStruct;
  }

  asPas() {
    return `.variable ${this.name} ${this.type}${this.const ? ' const' : ''}\n` +
           `  .userFlags ${this.userFlags}\n` +
           `  .initialValue ${this.initialValue} ` +
           `${this.inStruct ? `\n  .docString ${JSON.stringify(this.docString)}` : ''}\n` +
           `.endVariable`;
  }

  static readPex(pex, inStruct = false) {
    let variable = new PapyrusVariable(inStruct);

    variable.name = pex.readTableString();
    variable.type = pex.readTableString();
    variable.userFlags = pex.readUInt32();
    variable.initialValue = PapyrusValue.readPex(pex);
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

  writePex(pex) {
    pex.writeTableString(this.name);
    pex.writeTableString(this.type);
    pex.writeUInt32(this.userFlags);
    this.initialValue.writePex(pex);
    pex.writeUInt8(this.const ? 1 : 0);
    if (this.inStruct) pex.writeTableString(this.docString);
  }

  getStrings() {
    return [
      this.name,
      this.type,
      this.docString
    ];
  }
}
