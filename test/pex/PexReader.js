const PexReader = require('./../../src/pex/PexReader');

describe('PexReader', function () {
  describe('#readUInt8()', function () {
    it('should read a uint8', function () {
      let pex = new PexReader(Buffer.from([10]));
      assert.equal(pex.readUInt8(), 10);
    });
  });

  describe('#readUInt16()', function () {
    it('should read a uint16', function () {
      let pex = new PexReader(Buffer.from([10, 0]));
      assert.equal(pex.readUInt16(), 10);
    });
  });

  describe('#readString()', function () {
    it('should read a string', function () {
      let pex = new PexReader(
        Buffer.from([0x6, 0x0, 0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72])
      );
      assert.equal(pex.readString(), 'foobar');
    });
  });

  describe('#readTableString()', function () {
    it('should read a string from the table', function () {
      let pex = new PexReader(Buffer.from([10, 0]));
      pex.stringTable[10] = 'foobar';
      assert.equal(pex.readTableString(), 'foobar');
    });
  });
});
