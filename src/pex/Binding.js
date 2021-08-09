const PapyrusValue = require('./../script/PapyrusValue');

function target(name, code) {
  return code.findIndex((i) => i.op == 'label' && i.name == name);
}

function usesId(id, instruction) {
  return instruction.args.some(
    (a) => instruction.dest != a && a.type == 'id' && a.nvalue == id
  );
}

module.exports = class Binding {
  constructor(code, index, bindings) {
    this.instruction = code[index];
    this.to = this.instruction.dest.nvalue;
    this.ends = [];
    this.uses = [];
    this._getUses(code, index + 1);
    this._getEnds(code);
    this.bindings = bindings;
    this.index = index;
  }

  _getEnds(code) {
    for (let use of this.uses) {
      let nextInstruction = code[code.indexOf(use) + 1];
      if (
        use.op != 'jump' &&
        (!this.uses.includes(nextInstruction) || use == this.instruction)
      ) {
        this.ends.unshift(use);
      }
    }
    if (!this.ends.length) this.ends.push(this.instruction);
  }

  _getUses(code, index, visited = new Set()) {
    let instruction = code[index];
    if (!instruction || visited.has(instruction)) {
      return;
    }
    visited.add(instruction);

    if (instruction.target) {
      this._getUses(code, target(instruction.target, code), visited);
    }

    let nextInstruction = code[index + 1];

    if (nextInstruction && !['jump', 'return'].includes(instruction.op)) {
      if (instruction.dest) {
        if (instruction.dest.nvalue != this.to) {
          this._getUses(code, index + 1, visited);
        }
      } else {
        this._getUses(code, index + 1, visited);
      }
    }

    if (
      usesId(this.to, instruction) ||
      this.uses.includes(code[target(instruction.target, code)]) ||
      this.uses.includes(nextInstruction)
    ) {
      this.uses.unshift(instruction);
    }
  }

  static allBindings(code) {
    let bindings = [];
    for (let i = 0; i < code.length; i++) {
      let instruction = code[i];
      if (!instruction.dest) continue;
      bindings.push(new Binding(code, i, bindings));
    }
    return bindings;
  }

  intersects(binding) {
    for (let instruction of [binding.instruction, ...binding.uses]) {
      if (this.uses.includes(instruction) && !this.ends.includes(instruction)) {
        return true;
      }
    }

    for (let instruction of [this.instruction, ...this.uses]) {
      if (
        binding.uses.includes(instruction) &&
        !binding.ends.includes(instruction)
      ) {
        return true;
      }
    }

    return false;
  }

  siblings() {
    return this.bindings.filter(
      (b) => this != b && this.to == b.to && this.intersects(b)
    );
  }

  rewrite(id) {
    this.instruction.dest = id;
    for (let instruction of this.uses) {
      instruction.args = instruction.args.map((a) => {
        if (a.type == 'id' && a.nvalue == this.to && a != instruction.dest) {
          return new PapyrusValue('id', id.value);
        } else {
          return a;
        }
      });
    }
    this.to = id.nvalue;
  }

  usesId(id) {
    return this.uses.some((i) => usesId(id, i));
  }
};
