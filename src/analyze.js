
function liveSet(id, code, index, visited = new Set()) {
  let instruction = code[index];
  if (!instruction || visited.has(instruction)) {
    return [];
  }
  visited.add(instruction);

  let live = [];
  let next = [];
  if (instruction.target) {
    live = liveSet(id, code, target(instruction.target, code), visited);
  }

  if (code[index + 1]) {
    if (instruction.dest) {
      if (instruction.dest.value != id) {
        next = liveSet(id, code, index + 1, visited);
      }
    } else {
      next = liveSet(id, code, index + 1, visited);
    }
  }

  if (next.length || uses(id, instruction)) {
    live.push(instruction);
  }

  return live.concat(next);
}

function target(name, code) {
  return code.findIndex((i) => i.op == 'label' && i.name == name + ':');
}

function uses(id, instruction) {
  return instruction.args.some((a) => instruction.dest != a && a.type == 'id' && a.value == id);
}

function getAllBindings(code) {
  let bindings = [];
  for (let i = 0; i < code.length; i++) {
    let instruction = code[i];
    if (!instruction.dest) continue;
    bindings.push({
      to: instruction.dest.value,
      instruction: instruction,
      set: liveSet(instruction.dest.value, code, i + 1)
    });
  }
  return bindings;
}

function intersects(binding1, binding2) {
  if (binding1 == binding2) return false;
  let set1 = binding1.set;
  let set2 = binding2.set;
  return new Set([...set1, ...set2]).size != set1.length + set2.length;
}

function siblings(binding1, bindings) {
  let siblings = [];
  for (let binding2 of bindings) {
    if (binding1 == binding2) {
       continue;
    } else if (binding1.to == binding2.to && intersects(binding1, binding2)) {
      siblings.push(binding2);
    }
  }
  return siblings;
}

function rewriteArguments(instruction, oldId, newId) {
  instruction.args = instruction.args.map(a => {
    if (a.type == 'id' && a.value == oldId && a != instruction.dest) {
      return newId;
    } else {
      return a;
    }
  });
}

function rewriteInstructions(instructions, oldId, newId) {
  instructions.map((i) => rewriteArguments(i, oldId, newId));
}

function rewriteBinding(binding, newId) {
  binding.instruction.dest = newId;
  rewriteInstructions(binding.set, binding.to, newId);
  binding.to = newId.value;
}

exports.getAllBindings = getAllBindings;
exports.intersects = intersects;
exports.siblings = siblings;
exports.rewriteBinding = rewriteBinding;
