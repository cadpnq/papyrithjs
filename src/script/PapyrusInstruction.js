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
  ['cmp_eq', 3],
  ['cmp_lt', 3],
  ['cmp_le', 3],
  ['cmp_gt', 3],
  ['cmp_ge', 3],
  ['jmp', 1],
  ['jmpt', 2],
  ['jmpf', 2],
  ['callmethod', 3, true],
  ['callparent', 2, true],
  ['callstatic', 3, true],
  ['return', 1],
  ['strcat', 3],
  ['propget', 3],
  ['propset', 3],
  ['array_create', 2],
  ['array_length', 2],
  ['array_getelement', 3],
  ['array_setelement', 3],
  ['array_findelement', 4],
  ['array_rfindelement', 4],
  ['is', 3],
  ['struct_create', 1],
  ['struct_get', 3],
  ['struct_get', 3],
  ['array_findstruct', 5],
  ['array_rfindstruct', 5],
  ['array_add', 3],
  ['array_insert', 3],
  ['array_removelast', 1],
  ['array_remove', 3],
  ['array_clear', 1]
]);

module.exports = PapyrusInstruction;
