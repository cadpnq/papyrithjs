exports.command = 'assemble <file>';
exports.desc = 'assemble a pas file';
exports.desc = false;
exports.builder = (yargs) => {
  yargs.positional('file', {
    type: 'string',
    describe: 'the file to assemble'
  });
};
exports.handler = (argv) => {};
