const Binding = require('./Binding');

module.exports = class PexRewriter {
  constructor() {
    this.instructionRules = new Map();
    this.bindingRules = [];
  }

  addInstructionRule(instructions, rule) {
    for (let instruction of instructions) {
      if (!this.instructionRules.has(instruction)) {
        this.instructionRules.set(instruction, []);
      }
      this.instructionRules.get(instruction).unshift(rule);
    }
  }

  addBindingRule(instructions, scopes, rule) {
    this.bindingRules.unshift((func, binding) => {
      if (
        (!instructions.length ||
          instructions.indexOf(binding.instruction.op) >= 0) &&
        (!scopes.length || scopes.indexOf(binding.instruction.dest.scope) >= 0)
      ) {
        return rule(func, binding);
      }
    });
  }

  _rewriteInstructions(func) {
    let anyChange = false;
    let change = true;

    while (change) {
      change = false;
      outer: for (let i = 0; i < func.code.length; i++) {
        let instruction = func.code[i];
        if (this.instructionRules.has(instruction.op)) {
          for (let rule of this.instructionRules.get(instruction.op)) {
            change = rule(func, i);
            anyChange = anyChange || change;
            if (change) break outer;
          }
        }
      }
    }

    return anyChange;
  }

  _rewriteBindings(func) {
    let anyChange = false;
    let change = true;

    while (change) {
      change = false;
      outer: for (let binding of Binding.allBindings(func.code)) {
        for (let rule of this.bindingRules) {
          change = rule(func, binding);
          anyChange = anyChange || change;
          if (change) break outer;
        }
      }
    }

    return anyChange;
  }

  _rewriteFunction(func) {
    while (this._rewriteBindings(func) || this._rewriteInstructions(func));
    func.pruneLocals();
  }

  rewrite(script) {
    for (let object of Object.values(script.objectTable)) {
      for (let property of Object.values(object.propertyTable)) {
        if (property.Get) this._rewriteFunction(property.Get);
        if (property.Set) this._rewriteFunction(property.Set);
      }
      for (let state of Object.values(object.stateTable)) {
        for (let func of Object.values(state.functions)) {
          this._rewriteFunction(func);
        }
      }
    }
  }
};
