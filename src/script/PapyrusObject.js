const PapyrusBase = require('./PapyrusBase');
const PapyrusStruct = require('./PapyrusStruct');
const PapyrusVariable = require('./PapyrusVariable');
const PapyrusProperty = require('./PapyrusProperty');
const PapyrusState = require('./PapyrusState');
const PapyrusPropertyGroup = require('./PapyrusPropertyGroup');

module.exports = class PapyrusObject extends PapyrusBase {
  constructor() {
    super();
    this.name = '';
    this.extends = '';
    this.const = false;
    this.userFlags = 0;
    this.docString = '';
    this.autoState = '';

    this.structTable = {};
    this.variableTable = {};
    this.propertyTable = {};
    this.propertyGroupTable = {};
    this.stateTable = {};
  }

  asPas() {
    return (
      `.object ${this.name}${this.extends ? ' ' + this.extends : ''}\n` +
      `  .userFlags ${this.userFlags}\n` +
      `  .docString ${JSON.stringify(this.docString)}\n` +
      `  .autoState ${this.autoState}\n` +
      `  .structTable\n` +
      `${this._printTable(this.structTable, 4)}\n` +
      `  .endStructTable\n` +
      `  .variableTable\n` +
      `${this._printTable(this.variableTable, 4)}\n` +
      `  .endVariableTable\n` +
      `  .propertyTable\n` +
      `${this._printTable(this.propertyTable, 4)}\n` +
      `  .endPropertyTable\n` +
      `  .propertyGroupTable\n` +
      `${this._printTable(this.propertyGroupTable, 4)}\n` +
      `  .endPropertyGroupTable\n` +
      `  .stateTable\n` +
      `${this._printTable(this.stateTable, 4)}\n` +
      `  .endStateTable\n` +
      `.endObject`
    );
  }

  static readPex(pex) {
    let object = new PapyrusObject();

    object.name = pex.readTableString();

    let size = pex.readUInt32();

    object.extends = pex.readTableString();
    object.docString = pex.readTableString();
    object.const = pex.readUInt8() ? true : false;
    object.userFlags = pex.readUInt32();
    object.autoState = pex.readTableString();

    let count = pex.readUInt16();
    while (count--) {
      let struct = PapyrusStruct.readPex(pex);
      object.structTable[struct.name] = struct;
    }

    count = pex.readUInt16();
    while (count--) {
      let variable = PapyrusVariable.readPex(pex);
      object.variableTable[variable.name] = variable;
    }

    count = pex.readUInt16();
    while (count--) {
      let property = PapyrusProperty.readPex(pex);
      object.propertyTable[property.name] = property;
    }

    count = pex.readUInt16();
    while (count--) {
      let state = PapyrusState.readPex(pex);
      object.stateTable[state.name] = state;
    }

    return object;
  }

  static readPas(tokens) {
    let object = new PapyrusObject();
    let [name, extend] = tokens.read2('.object', false);
    object.name = name;
    object.extends = extend;
    object.const = tokens.maybe('const');
    tokens.expectEOL();

    object.userFlags = tokens.read1('.userFlags');
    object.docString = tokens.read1('.docString');
    object.autoState = '';
    tokens.expect('.autoState', false);
    if (tokens.peek() != '\n') object.autoState = tokens.read();
    tokens.expectEOL();

    object.structTable = tokens.readTable('struct', PapyrusStruct);
    object.variableTable = tokens.readTable('variable', PapyrusVariable);
    object.propertyTable = tokens.readTable('property', PapyrusProperty);
    object.propertyGroupTable = tokens.readTable(
      'propertyGroup',
      PapyrusPropertyGroup
    );
    object.stateTable = tokens.readTable('state', PapyrusState);

    tokens.expect('.endObject');

    return object;
  }

  writePex(pex) {
    pex.writeTableString(this.name);

    let sizeIndex = pex.data().length;
    pex.writeUInt32(0);

    pex.writeTableString(this.extends);
    pex.writeTableString(this.docString);
    pex.writeUInt8(this.const ? 1 : 0);
    pex.writeUInt32(this.userFlags);
    pex.writeTableString(this.autoState);

    let structs = Object.values(this.structTable);
    pex.writeUInt16(structs.length);
    structs.map((s) => s.writePex(pex));

    let variables = Object.values(this.variableTable);
    pex.writeUInt16(variables.length);
    variables.map((v) => v.writePex(pex));

    let properties = Object.values(this.propertyTable);
    pex.writeUInt16(properties.length);
    properties.map((p) => p.writePex(pex));

    let states = Object.values(this.stateTable);
    pex.writeUInt16(states.length);
    states.map((s) => s.writePex(pex));

    let endOfObject = pex.data().length;
    pex.data().writeUInt32LE(endOfObject - sizeIndex, sizeIndex);
  }

  getStrings() {
    return [
      this.name,
      this.extends,
      this.docString,
      this.autoState,
      ...this._getStringsFromTable(this.structTable),
      ...this._getStringsFromTable(this.variableTable),
      ...this._getStringsFromTable(this.propertyTable),
      ...this._getStringsFromTable(this.propertyGroupTable),
      ...this._getStringsFromTable(this.stateTable)
    ];
  }
};
