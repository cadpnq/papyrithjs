require('yargonaut')
  .style('blue')
  .style('yellow', 'required')
  .helpStyle('green');

const yargs = require('yargs')
  .scriptName('papyrith')
  .usage('$0 <command> [args]')
  .commandDir('src/commands')
  .demandCommand(1, '')
  .help()
  .argv;
