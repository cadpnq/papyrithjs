const PapyrusBase = require('./PapyrusBase');
const PapyrusValue = require('./PapyrusValue');

class PapyrusInstruction extends PapyrusBase {
  constructor() {
    super();
    this._op = '';
    this.name = '';
    this.args = [];
    this.line = 0;
    this.targetOffset = 0;
    this.definition = {names: []};
  }

  set op(value) {
    this._op = value;
    if (value == 'label') return;
    for (let definition of Object.values(this.definitions)) {
      if (definition.name == value) {
        this.definition = definition;
        break;
      }
    }
  }

  get op() {
    return this._op;
  }

  get target() {
    return this.args[this.definition.names.indexOf('target')];
  }

  get dest() {
    return this.args[this.definition.names.indexOf('dest')];
  }

  set dest(value) {
    this.args[this.definition.names.indexOf('dest')] = value;
  }

  get arg1() {
    return this.args[this.definition.names.indexOf('arg1')];
  }

  get arg2() {
    return this.args[this.definition.names.indexOf('arg2')];
  }

  isLabel() {
    return !this.op == 'label';
  }

  asPas() {
    if (this.op == 'label') {
      return this.name;
    } else {
      return `${this.op} ${this.args.join(' ')} ${this.line ? `;@line ${this.line}` : ''}`;
    }
  }

  static defineInstruction(opcode, name, arity, names = [], varargs = false) {
    if (!this.definitions) {
      this.definitions = {};
      this.prototype.definitions = this.definitions;
    }
    this.definitions[opcode] = {opcode, name, arity, names, varargs};
  }

  static defineInstructions(definitions) {
    for (let i = 0; i < definitions.length; i++) {
      this.defineInstruction(i, ...definitions[i]);
    }
  }

  static readPex(pex) {
    let instruction = new PapyrusInstruction();

    let op = pex.readUInt8();
    let {name, arity, varargs} = this.definitions[op];
    instruction.op = name;

    while (arity--) {
      instruction.args.push(PapyrusValue.readPex(pex));
    }

    if (varargs) {
      let count = PapyrusValue.readPex(pex).value;
      while (count--) {
        instruction.args.push(PapyrusValue.readPex(pex));
      }
    }

    return instruction;
  }

  static readPas(tokens) {
    let instruction = new PapyrusInstruction();

    let name = tokens.read();
    if (name.endsWith(':')) {
      tokens.expectEOL();
      instruction.op = 'label';
      instruction.name = name;
    } else {
      instruction.op = name;
      instruction.args = [];

      while (tokens.peek() != '\n' && tokens.peek() != ';@line') {
        instruction.args.push(tokens.read());
      }

      if (tokens.peek() == ';@line') {
        tokens.read();
        instruction.line = tokens.read();
      }
      tokens.expectEOL();
    }

    return instruction;
  }

  writePex(pex) {
    if (this.op == 'label') return;
    let {opcode, arity, varargs} = this.definition;
    pex.writeUInt8(opcode);

    for (let i = 0; i <= this.args.length; i++) {
      if (varargs && i == arity) {
        new PapyrusValue('integer', this.args.length - i).writePex(pex);
      }
      let arg = this.args[i];
      if (!arg) {
        break;
      } else if (arg instanceof PapyrusValue) {
        arg.writePex(pex);
      } else {
        pex.writeUInt8(3);
        pex.writeInt32(this.targetOffset);
      }
    }
  }

  getStrings() {
    return this._getStringsFromTable(this.args);
  }
}

PapyrusInstruction.defineInstructions([
  ['nop', 0],
  ['iadd', 3, ['dest', 'arg1', 'arg2']],
  ['fadd', 3, ['dest', 'arg1', 'arg2']],
  ['isub', 3, ['dest', 'arg1', 'arg2']],
  ['fsub', 3, ['dest', 'arg1', 'arg2']],
  ['imultiply', 3, ['dest', 'arg1', 'arg2']],
  ['fmultiply', 3, ['dest', 'arg1', 'arg2']],
  ['idiv', 3, ['dest', 'arg1', 'arg2']],
  ['fdiv', 3, ['dest', 'arg1', 'arg2']],
  ['imod', 3, ['dest', 'arg1', 'arg2']],
  ['not', 2, ['dest', 'arg1']],
  ['ineg', 2, ['dest', 'arg1']],
  ['fneg', 2, ['dest', 'arg1']],
  ['assign', 2, ['dest', 'arg1']],
  ['cast', 2, ['dest', 'arg1']],
  ['compareeq', 3, ['dest', 'arg1', 'arg2']],
  ['comparelt', 3, ['dest', 'arg1', 'arg2']],
  ['comparele', 3, ['dest', 'arg1', 'arg2']],
  ['comparegt', 3, ['dest', 'arg1', 'arg2']],
  ['comparege', 3, ['dest', 'arg1', 'arg2']],
  ['jump', 1, ['target']],
  ['jumpt', 2, ['arg1', 'target']],
  ['jumpf', 2, ['arg1', 'target']],
  ['callmethod', 3, ['on', 'name', 'dest'], true],
  ['callparent', 2, ['name', 'dest'], true],
  ['callstatic', 3, ['on', 'name', 'dest'], true],
  ['return', 1, ['arg1']],
  ['strcat', 3, ['dest', 'arg1', 'arg2']],
  ['propget', 3, ['arg1', 'arg2', 'dest']],
  ['propset', 3],
  ['arraycreate', 2, ['dest', 'arg1']],
  ['arraylength', 2, ['dest', 'arg1']],
  ['arraygetelement', 3, ['dest', 'arg1', 'arg2']],
  ['arraysetelement', 3, ['arg1', 'arg2', 'arg3']],
  ['arrayfindelement', 4, ['arg1', 'dest']],
  ['arrayrfindelement', 4, ['arg1', 'dest']],
  ['is', 3, ['dest', 'arg1', 'arg2']],
  ['structcreate', 1, ['dest']],
  ['structget', 3, ['dest', 'arg1', 'arg2']],
  ['structset', 3],
  ['arrayfindstruct', 5, ['arg1', 'dest']],
  ['arrayrfindstruct', 5, ['arg1', 'dest']],
  ['arrayadd', 3],
  ['arrayinsert', 3],
  ['arrayremovelast', 1],
  ['arrayremove', 3],
  ['arrayclear', 1]
]);

module.exports = PapyrusInstruction;
