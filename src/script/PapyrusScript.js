const fs = require('fs');
const PapyrusBase = require('./PapyrusBase');
const PapyrusObject = require('./PapyrusObject');
const PapyrusPropertyGroup = require('./PapyrusPropertyGroup');
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

    if (pex.readUInt32() != 0xFA57C0DE) {
      // this isn't a valid script file
      return script;
    }

    // should probably verify these as well or something
    let major = pex.readUInt8();
    let minor = pex.readUInt8();
    let gameId = pex.readUInt16();

    script.info.compileTime = pex.readUInt64();

    script.info.source = pex.readString();
    script.info.user = pex.readString();
    script.info.computer = pex.readString();

    let strings = pex.readUInt16();
    for (let i = 0; i < strings; i++) {
      pex.stringTable[i.toString()] = pex.readString();
    }

    let functionInfo = [];
    let groupInfo = [];
    let structInfo = [];
    let hasDebug = pex.readUInt8();
    if (hasDebug) {
      script.info.modifyTime = pex.readUInt64();

      let count = pex.readUInt16();
      while (count--) {
        let info = {
          objectName: pex.readTableString(),
          stateName: pex.readTableString(),
          functionName: pex.readTableString(),
          functionType: pex.readUInt8(),
          instructionCount: pex.readUInt16(),
          lineNumbers: []
        };
        for (let i = 0; i < info.instructionCount; i++) {
          info.lineNumbers.push(pex.readUInt16());
        }
        functionInfo.push(info);
      }

      count = pex.readUInt16();
      while (count--) {
        let info = {
          objectName: pex.readTableString(),
          groupName: pex.readTableString(),
          docString: pex.readTableString(),
          userFlags: pex.readUInt32(),
          propertyCount: pex.readUInt16(),
          properties: []
        };
        for (let i = 0; i < info.propertyCount; i++) {
          info.properties.push(pex.readTableString());
        }
        groupInfo.push(info);
      }

      count = pex.readUInt16();
      while (count--) {
        let info = {
          objectName: pex.readTableString(),
          structName: pex.readTableString(),
          count: pex.readUInt16(),
          names: []
        };
        for (let i = 0; i < info.count; i++) {
          info.names.push(pex.readTableString());
        }
      }
    }

    let flagCount = pex.readUInt16();

    while (flagCount--) {
      let name = pex.readTableString();
      script.userFlagsRef[name] = pex.readUInt8();
    }

    let objectCount = pex.readUInt16();
    while (objectCount--) {
      let object = PapyrusObject.readPex(pex);
      script.objectTable[object.name] = object;
    }

    if (hasDebug) {
      for (let {objectName, stateName, functionName, functionType, instructionCount, lineNumbers} of functionInfo) {

        // optional chaining when?
        let func;
        if (functionType == 0) {
          if (!script.objectTable[objectName] || !script.objectTable[objectName].stateTable[stateName] || !script.objectTable[objectName].stateTable[stateName].functions[functionName]) continue;
          func = script.objectTable[objectName].stateTable[stateName].functions[functionName];
        } else if (functionType == 1 || functionType == 2) {
          if (!script.objectTable[objectName] ||
              !script.objectTable[objectName].propertyTable[functionName]) continue;
          let property = script.objectTable[objectName].propertyTable[functionName];
          if (functionType == 1) {
            func = property.Get;
          } else if (functionType == 2) {
            func = property.Set;
          }
        }

        if (func) {
          for (let i = 0; i < instructionCount; i++) {
            func.code[i].line = lineNumbers[i];
          }
        }
      }

      for (let {objectName, groupName, docString, userFlags, properties} of groupInfo) {
        if (!script.objectTable[objectName]) continue;
        let propertyGroup = new PapyrusPropertyGroup();
        propertyGroup.groupName = groupName;
        propertyGroup.docString = docString;
        propertyGroup.userFlags = userFlags;
        propertyGroup.properties = properties;
        script.objectTable[objectName].propertyGroupTable[groupName] = propertyGroup;
      }
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
