const PapyrusBase = require('./PapyrusBase');

class PapyrusInstruction extends PapyrusBase {
  constructor() {
    super();
    this.op = '';
    this.name = '';
    this.arguments = [];
    this.line = 0;
  }

  asPas() {
    if (this.op == 'label') {
      return this.name;
    } else {
      return `${this.op} ${this.arguments.join(' ')} ${this.line ? `;@line ${this.line}` : ''}`;
    }
  }

  static defineInstruction(opcode, name, args, varargs = false) {
    if (!this.definitions) {
      this.definitions = {};
    }
    this.definitions[opcode] = {opcode, name, args, varargs};
  }

  static defineInstructions(definitions) {
    for (let i = 0; i < definitions.length; i++) {
      this.defineInstruction(i, ...definitions[i]);
    }
  }

  static readPex(pex) {
    let instruction = new PapyrusInstruction();

    let op = pex.readUInt8();
    let {name, args, varargs} = this.definitions[op];
    instruction.op = name;

    while (args--) {
      instruction.arguments.push(pex.readValue());
    }

    if (varargs) {
      let count = pex.readValue();
      while (count--) {
        instruction.arguments.push(pex.readValue());
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
      instruction.arguments = [];

      while (tokens.peek() != '\n' && tokens.peek() != ';@line') {
        instruction.arguments.push(tokens.read());
      }

      if (tokens.peek() == ';@line') {
        tokens.read();
        instruction.line = tokens.read();
      }
      tokens.expectEOL();
    }

    return instruction;
  }
}

PapyrusInstruction.defineInstructions([
  ['nop', 0],
  ['iadd', 3],
  ['fadd', 3],
  ['isub', 3],
  ['fsub', 3],
  ['imul', 3],
  ['fmul', 3],
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
