const PapyrusInstruction = require('./../../src/script/PapyrusInstruction');
const PapyrusValue = require('./../../src/script/PapyrusValue');
const PexWriter = require('./../../src/pex/PexWriter');

describe('PapyrusInstruction', function () {
  describe('#writePex()', function () {
    let pex, instruction;
    beforeEach(function () {
      pex = new PexWriter();
      pex.stringTable = {
        what: 0,
        of: 1,
        to: 2
      };
      instruction = new PapyrusInstruction();
    });

    it('should handle vararg instructions', function () {
      instruction.op = 'callmethod';
      instruction.args = [
        new PapyrusValue('id', 'what'),
        new PapyrusValue('id', 'of'),
        new PapyrusValue('id', 'to'),
        new PapyrusValue('integer', 42)
      ];

      instruction.writePex(pex);
      assert.deepEqual(
        pex.data(),
        Buffer.from([
          0x17, 1, 0, 0, 1, 1, 0, 1, 2, 0, 3, 1, 0, 0, 0, 3, 42, 0, 0, 0
        ])
      );
    });
  });
});
