const fs = require('fs');
const PapyrusBase = require('./PapyrusBase');
const PapyrusObject = require('./PapyrusObject');
const PexReader = require('./../pex/PexReader');
const PasReader = require('./../reader/PasReader');

module.exports = class PapyrusScript extends PapyrusBase {
  constructor() {
    super();
    this.info = {
      source: '""',
      modifyTime: 0,
      compileTime: 0,
      user: '""',
      computer: '""'
    };
    this.userFlagsRef = {};
    this.objectTable = {};
  }

  asPas() {
    return `.info\n` +
           `  .source ${this.info.source}\n` +
           `  .modifyTime ${this.info.modifyTime}\n` +
           `  .compileTime ${this.info.compileTime}\n` +
           `  .user ${this.info.user}\n` +
           `  .computer ${this.info.computer}\n` +
           `.endInfo\n` +
           `.userFlagsRef\n` +
           `${this._printSimpleTable(this.userFlagsRef, '.flag', 2)}\n` +
           `.endUserFlagsRef\n` +
           `.objectTable\n` +
           `${this._printTable(this.objectTable)}\n` +
           `.endObjectTable`;
  }

  static load(filename) {
    let buffer = fs.readFileSync(filename);
    if (filename.endsWith('.pex')) {
      return this.loadPex(buffer);
    } else if (filename.endsWith('.pas')) {
      return this.loadPas(buffer);
    } else {
      throw `no`
    }
  }

  static loadPex(buffer) {
    let script = new PapyrusScript();
    let pex = new PexReader(buffer);

    if (pex.readInt32() != 0xFA57C0DE) {
      // this isn't a valid script file
      return script;
    }

    // should probably verify these as well or something
    let major = pex.readInt8();
    let minor = pex.readInt8();
    let gameId = pex.readInt16();

    script.info.compileTime = pex.readInt64();

    script.info.source = pex.readString();
    script.info.user = pex.readString();
    script.info.computer = pex.readString();

    let strings = pex.readInt16();
    for (let i = 0; i < strings; i++) {
      pex.stringTable[i.toString()] = pex.readString();
    }

    let functionInfo = [];
    let groupInfo = [];
    let structInfo = [];
    let hasDebug = pex.readInt8();
    if (hasDebug) {
      script.info.modifyTime = pex.readInt64();

      let count = pex.readInt16();
      while (count--) {
        let info = {
          objectName: pex.readTableString(),
          stateName: pex.readTableString(),
          functionName: pex.readTableString(),
          functionType: pex.readInt8(),
          instructionCount: pex.readInt16(),
          lineNumbers: []
        };
        for (let i = 0; i < info.instructionCount; i++) {
          info.lineNumbers.push(pex.readInt16());
        }
        functionInfo.push(info);
      }

      count = pex.readInt16();
      while (count--) {
        let info = {
          objectName: pex.readTableString(),
          groupName: pex.readTableString(),
          docString: pex.readTableString(),
          userFlags: pex.readInt32(),
          propertyCount: pex.readInt16(),
          properties: []
        };
        for (let i = 0; i < info.propertyCount; i++) {
          info.properties.push(pex.readTableString());
        }
        groupInfo.push(info);
      }

      count = pex.readInt16();
      while (count--) {
        let info = {
          objectName: pex.readTableString(),
          structName: pex.readTableString(),
          count: pex.readInt16(),
          names: []
        };
        for (let i = 0; i < info.count; i++) {
          info.names.push(pex.readTableString());
        }
      }
    }

    let flagCount = pex.readInt16();

    while (flagCount--) {
      let name = pex.readTableString();
      script.userFlagsRef[name] = pex.readInt8();
    }

    let objectCount = pex.readInt16();
    while (objectCount--) {
      let object = PapyrusObject.readPex(pex);
      script.objectTable[object.name] = object;
    }

    return script;
  }

  static loadPas(buffer) {
    let tokens = new PasReader(buffer.toString());
    let script = new PapyrusScript();

    tokens.expect('.info');
    script.info.source = tokens.read1('.source');
    script.info.modifyTime = Number(tokens.read1('.modifyTime'));
    script.info.compileTime = Number(tokens.read1('.compileTime'));
    script.info.user = tokens.read1('.user');
    script.info.computer = tokens.read1('.computer');
    tokens.expect('.endInfo');

    tokens.expect('.userFlagsRef');
    while (tokens.peek() != '.endUserFlagsRef') {
      let [name, value] = tokens.read2('.flag');
      script.userFlagsRef[name] = value;
    }
    tokens.expect('.endUserFlagsRef');

    script.objectTable = tokens.readTable('object', PapyrusObject);

    return script;
  }
}
