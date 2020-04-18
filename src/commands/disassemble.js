exports.command = 'disassemble <file>';
exports.desc = 'disassemble a pex file';
exports.builder = (yargs) => {
  yargs.positional('file', {
    type: 'string',
    describe: 'the file to disassemble'
  });
};
exports.handler = (argv) => {
}
