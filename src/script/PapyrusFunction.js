const PapyrusBase = require('./PapyrusBase');
const PapyrusInstruction = require('./PapyrusInstruction');

module.exports = class PapyrusFunction extends PapyrusBase {
  constructor(isNamed = true) {
    super();
    this.name = '';
    this.static = false;
    this.userFlags = 0;
    this.docString = '';
    this.return = '';
    this.params = {};
    this.locals = {};
    this.code = [];
    this.isNamed = isNamed;
  }

  asPas() {
    return `.function ${this.name}\n` +
           `  .userFlags ${this.userFlags}\n` +
           `  .docString ${JSON.stringify(this.docString)}\n` +
           `  .return ${this.return}\n` +
           `  .paramTable\n` +
           (Object.keys(this.params).length ? `${this._printSimpleTable(this.params, '.param', 4)}\n` : '') +
           `  .endParamTable\n` +
           `  .localTable\n` +
           (Object.keys(this.locals).length ? `${this._printSimpleTable(this.locals, '.local', 4)}\n` : '') +
           `  .endLocalTable\n` +
           `  .code\n` +
           (this.code.length ? `${this._printTable(this.code, 4)}\n` : '') +
           `  .endCode\n` +
           `.endFunction`;
  }

  static readPex(pex, isNamed = true) {
    let func = new PapyrusFunction(isNamed);
    if (isNamed) func.name = pex.readTableString();
    func.return = pex.readTableString();
    func.docString = pex.readTableString();
    func.userFlags = pex.readUInt32();
    func.flags = pex.readUInt8();

    let count = pex.readUInt16();
    while (count--) {
      func.params[pex.readTableString()] = pex.readTableString();
    }

    count = pex.readUInt16();
    while (count-- > 0) {
      func.locals[pex.readTableString()] = pex.readTableString();
    }

    let code = func.code;
    count = pex.readUInt16();
    while (count--) {
      code.push(PapyrusInstruction.readPex(pex));
    }

    return func;
  }

  static readPas(tokens) {
    let func = new PapyrusFunction();
    func.name = tokens.read1('.function', false);
    func.static = tokens.maybe('static');
    tokens.expectEOL();

    func.userFlags = tokens.read1('.userFlags');
    func.docString = tokens.read1('.docString');
    func.return = tokens.read1('.return');

    tokens.expect('.paramTable');
    func.params = {};
    while (tokens.peek() != '.endParamTable') {
      let [name, type] = tokens.read2('.param');
      func.params[name] = type;
    }
    tokens.expect('.endParamTable');

    tokens.expect('.localTable');
    func.locals = {};
    while (tokens.peek() != '.endLocalTable') {
      let [name, type] = tokens.read2('.local');
      func.locals[name] = type;
    }
    tokens.expect('.endLocalTable');

    tokens.expect('.code');
    func.code = [];
    while (tokens.peek() != '.endCode') {
      func.code.push(PapyrusInstruction.readPas(tokens));
    }
    tokens.expect('.endCode');
    tokens.expect('.endFunction');

    return func;
  }

  generateLabels() {
    for (let i = 0; i < this.code.length; i++) {
      this.code[i].index = i;
    }

    let labelNumber = 0;
    let maxIndex = this.code.length - 1;
    for (let i = 0; i < this.code.length; i++) {
      let {op, args, index} = this.code[i];
      if (op != 'jump' && op != 'jumpt' && op != 'jumpf') continue;

      let labelName = `label${labelNumber++}`;
      let label = new PapyrusInstruction();
      label.op = 'label';
      label.name = labelName;

      let target;
      if (op == 'jump') {
        target = args[0];
        args[0] = labelName;
      } else {
        target = args[1];
        args[1] = labelName;
      }
      let targetIndex = target + index;

      if (target < 0) i++;

      if (targetIndex > maxIndex) {
        this.code.push(label);
      } else {
        for (let j = 0; j < this.code.length; j++) {
          if (this.code[j].index == targetIndex) {
            this.code.splice(j, 0, label);
            break;
          }
        }
      }
    }

    for (let i = 0; i < this.code.length; i++) {
      delete this.code[i].index;
    }
  }

  genrateIdInfo(object) {
    for (let instruction of this.code) {
      for (let arg of instruction.args) {
        if (arg.type != 'id') continue;
        let name = arg.nvalue;
        let local = Object.keys(this.locals).find((l) => l.toLowerCase() == name);
        if (local) {
          arg.idType = this.locals[local];
          if (name.startsWith('::temp')) {
            arg.scope = 'temp';
          } else {
            arg.scope = 'local';
          }
          continue;
        }

        let param = Object.keys(this.params).find((p) => p.toLowerCase() == name);
        if (param) {
          arg.idType = this.params[param];
          arg.scope = 'parameter';
          continue;
        }

        let variable = Object.keys(object.variableTable).find((v) => v.toLowerCase() == name);
        if (variable) {
          arg.idType = object.variableTable[variable].type.toLowerCase();
          arg.scope = 'variable';
          continue;
        }

        let property = Object.keys(object.propertyTable).find((p) => p.toLowerCase() == name);
        if (property) {
          arg.idType = object.propertyTable[property].type.toLowerCase();
          arg.scope = 'property';
          continue;
        }
      }
    }
  }

  writePex(pex) {
    if (this.isNamed) pex.writeTableString(this.name);
    pex.writeTableString(this.return);
    pex.writeTableString(this.docString);
    pex.writeUInt32(this.userFlags);
    pex.writeUInt8(this.flags);

    pex.writeUInt16(Object.values(this.params).length);
    for (let [name, type] of Object.entries(this.params)) {
      pex.writeTableString(name);
      pex.writeTableString(type);
    }

    pex.writeUInt16(Object.values(this.locals).length);
    for (let [name, type] of Object.entries(this.locals)) {
      pex.writeTableString(name);
      pex.writeTableString(type);
    }

    let labelTable = {};
    let instructionIndex = 0;
    for (let instruction of this.code) {
      if (instruction.op != 'label') {
        instructionIndex++;
      } else {
        labelTable[instruction.name] = instructionIndex;
      }
    }

    instructionIndex = 0;
    for (let instruction of this.code) {
      if (instruction.op == 'label') continue;
      if (instruction.op != 'jump' && instruction.op != 'jumpt' && instruction.op != 'jumpf') {
        instructionIndex++;
        continue;
      }

      if (instruction.op == 'jump') {
        instruction.targetOffset = labelTable[instruction.args[0]] - instructionIndex;
      } else {
        instruction.targetOffset = labelTable[instruction.args[1]] - instructionIndex;
      }
      instructionIndex++;
    }

    pex.writeUInt16(this.code.filter((i) => i.op != 'label').length);
    this.code.map((i) => i.writePex(pex));
  }

  getStrings() {
    return [
      this.isNamed ? this.name : '',
      this.return,
      this.docString,
      ...Object.values(this.locals),
      ...Object.keys(this.locals),
      ...Object.values(this.params),
      ...Object.keys(this.params),
      ...this._getStringsFromTable(this.code)
    ];
  }
}
