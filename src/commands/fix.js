exports.command = 'fix <file>';
exports.desc = 'fix a file for decompilation with Champollion';
exports.builder = (yargs) => {
  yargs.positional('file', {
    type: 'string',
    describe: 'the file to fix'
  });
};
exports.handler = (argv) => {
}
