const PapyrusBase = require('./PapyrusBase');
const PapyrusValue = require('./PapyrusValue');

class PapyrusInstruction extends PapyrusBase {
  constructor() {
    super();
    this.op = '';
    this.name = '';
    this.args = [];
    this.line = 0;
    this.targetOffset = 0;
  }

  asPas() {
    if (this.op == 'label') {
      return this.name;
    } else {
      return `${this.op} ${this.args.join(' ')} ${this.line ? `;@line ${this.line}` : ''}`;
    }
  }

  static defineInstruction(opcode, name, arity, varargs = false) {
    if (!this.definitions) {
      this.definitions = {};
      this.prototype.definitions = this.definitions;
    }
    this.definitions[opcode] = {opcode, name, arity, varargs};
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
    let arity, varargs;
    for (let definition of Object.values(this.definitions)) {
      if (definition.name == this.op) {
        pex.writeUInt8(definition.opcode);
        arity = definition.arity;
        varargs = definition.varargs;
        break;
      }
    }

    for (let i = 0; i < this.args.length; i++) {
      if (varargs && i == arity) {
        new PapyrusValue('integer', this.args.length - i).writePex(pex);
      }
      let arg = this.args[i];
      if (arg instanceof PapyrusValue) {
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
  ['iadd', 3],
  ['fadd', 3],
  ['isub', 3],
  ['fsub', 3],
  ['imultiply', 3],
  ['fmultiply', 3],
  ['idiv', 3],
  ['fdiv', 3],
  ['imod', 3],
  ['not', 2],
  ['ineg', 2],
  ['fneg', 2],
  ['assign', 2],
  ['cast', 2],
  ['compareeq', 3],
  ['comparelt', 3],
  ['comparele', 3],
  ['comparegt', 3],
  ['comparege', 3],
  ['jump', 1],
  ['jumpt', 2],
  ['jumpf', 2],
  ['callmethod', 3, true],
  ['callparent', 2, true],
  ['callstatic', 3, true],
  ['return', 1],
  ['strcat', 3],
  ['propget', 3],
  ['propset', 3],
  ['arraycreate', 2],
  ['arraylength', 2],
  ['arraygetelement', 3],
  ['arraysetelement', 3],
  ['arrayfindelement', 4],
  ['arrayrfindelement', 4],
  ['is', 3],
  ['structcreate', 1],
  ['structget', 3],
  ['structget', 3],
  ['arrayfindstruct', 5],
  ['arrayrfindstruct', 5],
  ['arrayadd', 3],
  ['arrayinsert', 3],
  ['arrayremovelast', 1],
  ['arrayremove', 3],
  ['arrayclear', 1]
]);

module.exports = PapyrusInstruction;
