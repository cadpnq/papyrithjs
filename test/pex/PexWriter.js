const PexWriter = require('./../../src/pex/PexWriter');

describe('PexWriter', function () {
  let pex;
  beforeEach(function () {
    pex = new PexWriter();
  });

  describe('#writeUInt8()', function () {
    it('should write a unint8', function () {
      pex.writeUInt8(10);
      assert.deepEqual(pex.data(), Buffer.from([10]));
    });
  });

  describe('#writeUInt16()', function () {
    it('should write a unint16', function () {
      pex.writeUInt16(10);
      assert.deepEqual(pex.data(), Buffer.from([10, 0]));
    });
  });

  describe('#writeString()', function () {
    it('should write string', function () {
      pex.writeString('foobar');
      assert.deepEqual(
        pex.data(),
        Buffer.from([0x6, 0x0, 0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72])
      );
    });
  });

  describe('#writeTableString()', function () {
    it('should write a string index', function () {
      pex.stringTable['foobar'] = 10;
      pex.writeTableString('foobar');
      assert.deepEqual(pex.data(), Buffer.from([10, 0]));
    });
  });
});
