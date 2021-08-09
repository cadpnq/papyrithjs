const fs = require('fs');
const PapyrusScript = require('./../script/PapyrusScript');
const PapyrusValue = require('./../script/PapyrusValue');
const deoptimize = require('./../pex/deoptimize');

exports.command = 'fix <file>';
exports.desc = 'fix a file for decompilation with Champollion';
exports.builder = (yargs) => {
  yargs
    .positional('file', {
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
  let { file, output } = argv;

  if (!file.endsWith('.pex')) file += '.pex';

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
  deoptimize.rewrite(script);

  fs.writeFileSync(output, script.savePex().data());
};
