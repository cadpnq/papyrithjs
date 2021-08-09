const PexRewriter = require('./PexRewriter');
const PapyrusValue = require('./../script/PapyrusValue');

module.exports = rewriter = new PexRewriter();

rewriter.addBindingRule([], ['temp'], (func, binding) => {
  for (let binding2 of binding.bindings) {
    if (
      binding == binding2 ||
      binding.to != binding2.to ||
      binding2.instruction.dest.scope != 'temp' ||
      binding.intersects(binding2) ||
      binding2.siblings().length > 0
    )
      continue;

    let tempNumber = 0;
    while (func.locals[`::temp${tempNumber}`]) tempNumber++;
    let newTemp = new PapyrusValue('id', `::temp${tempNumber}`);
    newTemp.scope = 'temp';
    newTemp.idType = binding.instruction.dest.idType;
    func.locals[newTemp.value] = newTemp.idType;

    binding2.rewrite(newTemp);
  }
});
