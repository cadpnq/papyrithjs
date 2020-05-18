const PapyrusValue = require('./../script/PapyrusValue');

function target(name, code) {
  return code.findIndex((i) => i.op == 'label' && i.name == name);
}

function usesId(id, instruction) {
  return instruction.args.some((a) => instruction.dest != a && a.type == 'id' && a.nvalue == id);
}

module.exports = class Binding {
  constructor(code, index, bindings) {
    this.instruction = code[index];
    this.to = this.instruction.dest.nvalue;
    this.uses = this._getUses(code, index + 1);
    this.bindings = bindings;
    this.index = index;
    this.valid = true;
  }

  _getUses(code, index, visited = new Set()) {
    let instruction = code[index];
    if (!instruction || visited.has(instruction)) {
      return [];
    }
    visited.add(instruction);

    let uses = [];
    let next = [];
    if (instruction.target) {
      uses = this._getUses(code, target(instruction.target, code), visited);
    }

    if (code[index + 1]) {
      if (instruction.dest) {
        if (instruction.dest.nvalue != this.to) {
          next = this._getUses(code, index + 1, visited);
        }
      } else {
        next = this._getUses(code, index + 1, visited);
      }
    }

    if (next.length || usesId(this.to, instruction)) {
      uses.push(instruction);
    }

    return uses.concat(next);
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
   return new Set([...this.uses, ...binding.uses]).size != this.uses.length + binding.uses.length;
  }

  siblings() {
    return this.bindings.filter((b) => {
      this != b &&
      this.to == b.to &&
      this.intersects(b)
    });
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
}
