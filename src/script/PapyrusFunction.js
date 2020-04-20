const PapyrusBase = require('./PapyrusBase');
const PapyrusInstruction = require('./PapyrusInstruction');

module.exports = class PapyrusFunction extends PapyrusBase {
  constructor() {
    super();
    this.name = '';
    this.static = false;
    this.userFlags = 0;
    this.docString = '';
    this.return = '';
    this.params = {};
    this.locals = {};
    this.code = [];
  }

  asPas() {
    return `.function ${this.name}\n` +
           `  .userFlags ${this.userFlags}\n` +
           `  .docString ${this.docString}\n` +
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

  static readPex(pex, isNamed = false) {
    let func = new PapyrusFunction();
    if (!isNamed) {
      func.name = pex.readTableString();
    }
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

    for (let i = 0; i < code.length; i++) {
      code[i].index = i;
    }

    let labelNumber = 0;
    let maxIndex = code.length - 1;
    for (let i = 0; i < code.length; i++) {
      let {op, args, index} = code[i];
      if (op != 'jump' && op != 'jumpt' && op != 'jumpf') continue;

      let labelName = `label${labelNumber++}`;
      let label = new PapyrusInstruction();
      label.op = 'label';
      label.name = `${labelName}:`;

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
        code.push(label);
      } else {
        for (let j = 0; j < code.length; j++) {
          if (code[j].index == targetIndex) {
            code.splice(j, 0, label);
            break;
          }
        }
      }
    }

    for (let i = 0; i < code.length; i++) {
      delete code[i].index;
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
}
