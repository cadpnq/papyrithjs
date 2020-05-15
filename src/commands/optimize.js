const fs = require('fs');
const PapyrusScript = require('./../script/PapyrusScript');
const optimize = require('./../pex/optimize');


exports.command = 'optimize <file>';
exports.desc = 'optimize an existing pex/pas file';
exports.builder = (yargs) => {
  yargs.positional('file', {
    type: 'string',
    describe: 'the file to optimize'
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

  console.log('Optimizing functions...');
  optimize.rewrite(script);

  fs.writeFileSync(output, script.savePex().data());
}
