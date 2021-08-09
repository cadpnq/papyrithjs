const fs = require('fs');
const PapyrusScript = require('./../script/PapyrusScript');

exports.command = 'disassemble <file>';
exports.desc = 'disassemble a pex file';
exports.builder = (yargs) => {
  yargs
    .positional('file', {
      type: 'string',
      describe: 'the file to disassemble'
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
    output = file.substring(0, file.length - 4) + '.pas';
  } else if (!output.endsWith('.pas')) {
    output += '.pas';
  }

  if (!fs.existsSync(file)) {
    console.log('input file does not exist');
    return;
  }

  let script = PapyrusScript.load(file);
  fs.writeFileSync(output, script.asPas());
};
