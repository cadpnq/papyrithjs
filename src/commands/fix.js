const fs = require('fs');
const {getAllBindings, intersects, siblings, rewriteBinding} = require('./../analyze');
const PapyrusScript = require('./../script/PapyrusScript');
const PapyrusValue = require('./../script/PapyrusValue');

exports.command = 'fix <file>';
exports.desc = 'fix a file for decompilation with Champollion';
exports.builder = (yargs) => {
  yargs.positional('file', {
    type: 'string',
    describe: 'the file to fix'
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    describe: 'file to write output to'
  });
};
exports.handler = (argv) => {
  let {file, output} = argv;

  if (!file.endsWith('.pex'))
    file += '.pex';

  if (!output) {
    output = file;
  } else if (!output.endsWith('.pex')) {
    output += '.pex';
  }

  let script = PapyrusScript.load(file);

  let i32max = BigInt(Math.pow(2, 32) - 1);
  if (script.info.modifyTime > i32max) {
    console.log('Naughty modifyTime detected!');
    script.info.modifyTime &= i32max;
  }
  if (script.info.compileTime > i32max) {
    console.log('Naughty compileTime detected!');
    script.info.compileTime &= i32max;
  }

  console.log('Deoptimizing temporary variables...');
  for (let object of Object.values(script.objectTable)) {
    for (let property of Object.values(object.propertyTable)) {
      if (property.Get) deoptimizeTemporaries(property.Get);
      if (property.Set) deoptimizeTemporaries(property.Set);
    }
    for (let state of Object.values(object.stateTable)) {
      for (let func of Object.values(state.functions)) {
        deoptimizeTemporaries(func);
      }
    }
  }

  fs.writeFileSync(output, script.savePex().data());
}

function deoptimizeTemporaries(func) {
  let bindings = getAllBindings(func.code).filter((b) => b.to.startsWith('::temp'));

  for (let binding1 of bindings) {
    for (let binding2 of bindings) {
      if (binding1 == binding2 ||
          binding1.to != binding2.to ||
          intersects(binding1, binding2) ||
          siblings(binding2, bindings).length > 0) continue;

      let tempNumber = 0;
      while(func.locals[`::temp${tempNumber}`]) tempNumber++;
      let tempName = `::temp${tempNumber}`;
      let newTemp = new PapyrusValue('id', tempName);
      func.locals[tempName] = func.locals[binding1.instruction.dest.value];

      rewriteBinding(binding2, newTemp);
    }
  }
}
