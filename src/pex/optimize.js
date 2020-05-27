const PexRewriter = require('./PexRewriter');
const PapyrusValue = require('./../script/PapyrusValue');
const PapyrusInstruction = require('./../script/PapyrusInstruction');

module.exports = rewriter = new PexRewriter();

function branchesTo(func, label) {
  return func.code.filter((i) => i.target == label.name);
}

function killInstruction(func, index) {
  func.code.splice(index, 1);
}

function target(name, code) {
  return code.findIndex((i) => i.op == 'label' && i.name == name);
}

function newLabel(func) {
  let labelNumber = 0;
  let labelName;
  do {
    labelName = `label${labelNumber++}`
  } while (func.code.find((i) => i.op == 'label' && i.name == labelName));
  let label = new PapyrusInstruction();
  label.op = 'label';
  label.name = labelName;
  return label;
}

function getNonevar(func) {
  if (!func.locals['::nonevar']) func.locals['::nonevar'] = 'None';
  let nonevar = new PapyrusValue('id', '::nonevar');
  nonevar.scope = 'local';
  nonevar.idType = 'none';
  return nonevar;
}

// When two labels are next to one another all branches pointing at the first can be rewritten to point to the second.
rewriter.addInstructionRule(['label'], (func, index) => {
  let next = func.code[index + 1];
  if (!next) return;
  if (next.op == 'label') {
    for (let branch of branchesTo(func, func.code[index])) {
      branch.target = next.name;
    }
    return true;
  }
});

// When a label is followed by a jump all branches to the label can be rewritten to point to the target of the jump.
rewriter.addInstructionRule(['label'], (func, index) => {
  let next = func.code[index + 1];
  if (!next) return;
  if (next.op == 'jump') {
    for (let branch of branchesTo(func, func.code[index])) {
      branch.target = next.target;
    }
    return true;
  }
});

// A label with no branches targeting it can be removed.
rewriter.addInstructionRule(['label'], (func, index) => {
  if (branchesTo(func, func.code[index]).length == 0) {
    killInstruction(func, index);
    return true;
  }
});

// All code between a jump or return and the next label is dead and can be removed.
rewriter.addInstructionRule(['jump', 'return'], (func, index) => {
  let next = func.code[index + 1];
  if (!next || next.op == 'label') return;
  let killed = 0;
  while (next && next.op != 'label') {
    killed += 1;
    killInstruction(func, index + 1);
    next = func.code[index + 1];
  }
  return true;
});

// Branches followed by their target can be removed.
rewriter.addInstructionRule(['jump', 'jumpf', 'jumpt'], (func, index) => {
  let next = func.code[index + 1];
  if (!next) return;
  if (next.op == 'label' && func.code[index].target == next.name) {
    killInstruction(func, index);
    return true;
  }
});

// A conditional branch pointing at an identical conditional branch can be written to point at the target of the second one.
rewriter.addInstructionRule(['jumpf', 'jumpt'], (func, index) => {
  let instruction = func.code[index];
  let targetInstruction = func.code[target(instruction.target, func.code) + 1];
  if (targetInstruction &&
      instruction.op == targetInstruction.op &&
      instruction.arg1.nvalue == targetInstruction.arg1.nvalue) {
    instruction.target = targetInstruction.target;
    return true;
  }
});

// A conditional branch pointing at an opposite conditional branch can be written to point at just after the second branch.
rewriter.addInstructionRule(['jumpf', 'jumpt'], (func, index) => {
  let instruction = func.code[index];
  let targetIndex = target(instruction.target, func.code);
  let targetInstruction = func.code[targetIndex + 1];
  if (targetInstruction &&
      (targetInstruction.op == 'jumpf' || targetInstruction.op == 'jumpt') &&
      instruction.op != targetInstruction.op &&
      instruction.arg1.nvalue == targetInstruction.arg1.nvalue) {
    let label = newLabel(func);
    instruction.target = label.name;
    func.code.splice(targetIndex + 2, 0, label);
    return true;
  }
});

// Assigning or casting something to itself can be removed.
rewriter.addInstructionRule(['assign', 'cast'], (func, index) => {
  let instruction = func.code[index];
  if (instruction.dest.nvalue == instruction.arg1.nvalue) {
    killInstruction(func, index);
    return true;
  }
});

// With the exception of function calls, any instruction storing to ::nonevar can be removed.
rewriter.addInstructionRule(['iadd', 'fadd', 'isub', 'fsub', 'imultiply', 'fmultiply', 'idiv', 'fdiv', 'imod', 'not', 'ineg', 'fneg', 'assign', 'cast', 'compareeq', 'comparelt', 'comparele', 'comparegt', 'comparege', 'strcat', 'propget', 'arraycreate', 'arraylength', 'arraygetelement', 'arrayfindelement', 'arrayrfindelement', 'is', 'structcreate', 'structget', 'arrayfindstruct', 'arrayrfindstruct'], (func, index) => {
  let instruction = func.code[index];
  if (instruction.dest.nvalue == '::nonevar') {
    killInstruction(func, index);
    return true;
  }
});

// A cast instruction where dest and source are of the same type can be turned into an assign instruction.
rewriter.addInstructionRule(['cast'], (func, index) => {
  let instruction = func.code[index];
  if (instruction.dest.idType == (instruction.arg1.type == 'id' ? instruction.arg1.idType : instruction.arg1.type)) {
    instruction.op = 'assign';
    return true;
  }
});

// Any instruction except function calls that store a value that is not used can be removed.
rewriter.addBindingRule([], ['temp', 'local', 'parameter'], (func, binding) => {
  if (binding.uses.length > 0 ||
      binding.instruction.dest.nvalue == '::nonevar' ||
      ['callmethod', 'callparent', 'callstatic'].includes(binding.instruction.op)) return;
  killInstruction(func, binding.index);
  binding.valid = false;
  return true;
});

// Two groups of temporaries can be combined if they are of the same type and none of them interfere with each other.
rewriter.addBindingRule([], ['temp'], (func, binding) => {
  let these = [binding].concat(binding.siblings());
  for (let binding2 of binding.bindings) {
    if (binding.to == binding2.to) return false;
    if (binding2.instruction.dest.scope != 'temp' ||
        binding.instruction.dest.idType != binding2.instruction.dest.idType) continue;
    let those = binding.bindings.filter((b) => b.to == binding2.to);
    let valid = true;
    for (let x of these) {
      for (let y of those) {
        if (x.intersects(y)) {
          valid = false;
          if (!x.usesId(y.to) &&
              x.ends.every((i) => i.dest && i.dest.nvalue == y.to)) {
            valid = true;
          }
        }
      }
    }
    if (valid) {
      these.map((b) => b.rewrite(binding2.instruction.dest));
      return true;
    }
  }
});

// When a value is not'ed and only used in a branch the not can be removed and the branch can be rewritten to use the opposite condition.
rewriter.addBindingRule(['not'], ['temp'], (func, binding) => {
  if (binding.uses.length != 1) return;
  let next = binding.uses[0];
  if (next.op == 'jumpf' || next.op == 'jumpt') {
    next.arg1 = binding.instruction.arg1;
    if (next.op == 'jumpf') {
      next.op = 'jumpt';
    } else if (next.op == 'jumpt') {
      next.op = 'jumpf';
    }
    killInstruction(func, binding.index);
    return true;
  }
});

// Anything storing to a temp that is only used in an assign to another variable can be rewritten to store directly to that variable.
rewriter.addBindingRule([], ['temp'], (func, binding) => {
  let next = binding.uses[0];
  if (binding.uses.length != 1 ||
      next.op != 'assign' ||
      next.arg1 != binding.to) return;
  let nonevar = getNonevar(func);
  binding.instruction.dest = next.dest;
  next.dest = nonevar;
  return true;
});

// Any assign to a temporary that is only used in the next instruction can be removed and the next instruction rewritten to use the source of the assign.
rewriter.addBindingRule(['assign'], ['temp'], (func, binding) => {
  if (binding.uses.length != 1) return;
  let next = binding.uses[0];
  next.args = next.args.map((a) => {
    if (a.type == 'id' && a.nvalue == binding.to) {
      return binding.instruction.arg1;
    } else {
      return a;
    }
  });
  killInstruction(func, binding.index);
  return true;
});
