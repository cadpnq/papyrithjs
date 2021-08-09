const fs = require('fs');
const PapyrusBase = require('./PapyrusBase');
const PapyrusObject = require('./PapyrusObject');
const PapyrusPropertyGroup = require('./PapyrusPropertyGroup');
const PexReader = require('./../pex/PexReader');
const PexWriter = require('./../pex/PexWriter');
const PasReader = require('./../reader/PasReader');

module.exports = class PapyrusScript extends PapyrusBase {
  constructor() {
    super();
    this.info = {
      source: '',
      modifyTime: 0,
      compileTime: 0,
      user: '',
      computer: ''
    };
    this.userFlagsRef = {};
    this.objectTable = {};
    this.hasDebug = false;
  }

  asPas() {
    return (
      `.info\n` +
      `  .source ${JSON.stringify(this.info.source)}\n` +
      `  .modifyTime ${this.info.modifyTime}\n` +
      `  .compileTime ${this.info.compileTime}\n` +
      `  .user ${JSON.stringify(this.info.user)}\n` +
      `  .computer ${JSON.stringify(this.info.computer)}\n` +
      `.endInfo\n` +
      `.userFlagsRef\n` +
      `${this._printSimpleTable(this.userFlagsRef, '.flag', 2)}\n` +
      `.endUserFlagsRef\n` +
      `.objectTable\n` +
      `${this._printTable(this.objectTable)}\n` +
      `.endObjectTable`
    );
  }

  static load(filename) {
    let buffer = fs.readFileSync(filename);
    if (filename.endsWith('.pex')) {
      return this.loadPex(buffer);
    } else if (filename.endsWith('.pas')) {
      return this.loadPas(buffer);
    } else {
      throw `no`;
    }
  }

  static loadPex(buffer) {
    let script = new PapyrusScript();
    let pex = new PexReader(buffer);

    if (pex.readUInt32() != 0xfa57c0de) {
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
    script.hasDebug = hasDebug;
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
        structInfo.push(info);
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
      for (let {
        objectName,
        stateName,
        functionName,
        functionType,
        instructionCount,
        lineNumbers
      } of functionInfo) {
        // optional chaining when?
        let func;
        if (functionType == 0) {
          if (
            !script.objectTable[objectName] ||
            !script.objectTable[objectName].stateTable[stateName] ||
            !script.objectTable[objectName].stateTable[stateName].functions[
              functionName
            ]
          )
            continue;
          func =
            script.objectTable[objectName].stateTable[stateName].functions[
              functionName
            ];
        } else if (functionType == 1 || functionType == 2) {
          if (
            !script.objectTable[objectName] ||
            !script.objectTable[objectName].propertyTable[functionName]
          )
            continue;
          let property =
            script.objectTable[objectName].propertyTable[functionName];
          if (functionType == 1) {
            func = property.Get;
          } else if (functionType == 2) {
            func = property.Set;
          }
        }

        if (func) {
          for (let i = 0; i < instructionCount; i++) {
            if (func.code[i]) func.code[i].line = lineNumbers[i];
          }
        }
      }

      for (let {
        objectName,
        groupName,
        docString,
        userFlags,
        properties
      } of groupInfo) {
        if (!script.objectTable[objectName]) continue;
        let propertyGroup = new PapyrusPropertyGroup();
        propertyGroup.name = groupName;
        propertyGroup.docString = docString;
        propertyGroup.userFlags = userFlags;
        propertyGroup.properties = properties;
        script.objectTable[objectName].propertyGroupTable[groupName] =
          propertyGroup;
      }

      for (let { objectName, structName, names } of structInfo) {
        if (
          !script.objectTable[objectName] ||
          !script.objectTable[objectName].structTable[structName]
        )
          continue;
        script.objectTable[objectName].structTable[structName].memberOrder =
          names;
      }
    }

    for (let object of Object.values(script.objectTable)) {
      for (let property of Object.values(object.propertyTable)) {
        if (property.Get) {
          property.Get.generateLabels();
          property.Get.genrateIdInfo(object);
        }
        if (property.Set) {
          property.Set.generateLabels();
          property.Set.genrateIdInfo(object);
        }
      }
      for (let state of Object.values(object.stateTable)) {
        for (let func of Object.values(state.functions)) {
          func.generateLabels();
          func.genrateIdInfo(object);
        }
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

  savePex(path) {
    let pex = new PexWriter();

    // magic, major, minor, and gameid
    pex.writeUInt32(0xfa57c0de);
    pex.writeUInt8(3);
    pex.writeUInt8(9);
    pex.writeUInt16(2);

    pex.writeUInt64(this.info.compileTime);

    pex.writeString(this.info.source);
    pex.writeString(this.info.user);
    pex.writeString(this.info.computer);

    let strings = [...new Set(this.getStrings())];
    pex.writeUInt16(strings.length);
    for (let i = 0; i < strings.length; i++) {
      pex.stringTable[strings[i]] = i;
      pex.writeString(strings[i]);
    }

    if (this.hasDebug) {
      let functionInfo = [];
      let groupInfo = [];
      let structInfo = [];

      let lineNumbers = (func) =>
        func.code.filter((i) => i.op != 'label').map((i) => i.line);

      for (let object of Object.values(this.objectTable)) {
        for (let property of Object.values(object.propertyTable)) {
          if (property.Get) {
            let numbers = lineNumbers(property.Get);
            functionInfo.push({
              objectName: object.name,
              stateName: '',
              functionName: property.name,
              functionType: 1,
              instructionCount: numbers.length,
              lineNumbers: numbers
            });
          }

          if (property.Set) {
            let numbers = lineNumbers(property.Set);
            functionInfo.push({
              objectName: object.name,
              stateName: '',
              functionName: property.name,
              functionType: 2,
              instructionCount: numbers.length,
              lineNumbers: numbers
            });
          }
        }

        for (let state of Object.values(object.stateTable)) {
          for (let func of Object.values(state.functions)) {
            let numbers = lineNumbers(func);
            functionInfo.push({
              objectName: object.name,
              stateName: state.name,
              functionName: func.name,
              functionType: 0,
              instructionCount: numbers.length,
              lineNumbers: numbers
            });
          }
        }

        for (let group of Object.values(object.propertyGroupTable)) {
          groupInfo.push({
            objectName: object.name,
            groupName: group.name,
            docString: group.docString,
            userFlags: group.userFlags,
            propertyCount: group.properties.length,
            properties: group.properties
          });
        }

        for (let struct of Object.values(object.structTable)) {
          if (!struct.memberOrder.length) continue;
          structInfo.push({
            objectName: object.name,
            structName: struct.name,
            count: struct.memberOrder.length,
            names: struct.memberOrder
          });
        }
      }

      pex.writeUInt8(1);
      pex.writeUInt64(this.info.modifyTime);

      pex.writeUInt16(functionInfo.length);
      for (let info of functionInfo) {
        pex.writeTableString(info.objectName);
        pex.writeTableString(info.stateName);
        pex.writeTableString(info.functionName);
        pex.writeUInt8(info.functionType);
        pex.writeUInt16(info.instructionCount);
        info.lineNumbers.map((i) => pex.writeUInt16(i));
      }

      pex.writeUInt16(groupInfo.length);
      for (let info of groupInfo) {
        pex.writeTableString(info.objectName);
        pex.writeTableString(info.groupName);
        pex.writeTableString(info.docString);
        pex.writeUInt32(info.userFlags);
        pex.writeUInt16(info.propertyCount);
        info.properties.map((p) => pex.writeTableString(p));
      }

      pex.writeUInt16(structInfo.length);
      for (let info of structInfo) {
        pex.writeTableString(info.objectName);
        pex.writeTableString(info.structName);
        pex.writeUInt16(info.count);
        info.names.map((n) => pex.writeTableString(n));
      }
    } else {
      pex.writeUInt8(0);
    }

    pex.writeUInt16(Object.values(this.userFlagsRef).length);
    for (let [flag, index] of Object.entries(this.userFlagsRef)) {
      pex.writeTableString(flag);
      pex.writeUInt8(index);
    }

    let objects = Object.values(this.objectTable);
    pex.writeUInt16(objects.length);
    for (let object of objects) {
      object.writePex(pex);
    }

    return pex;
  }

  getStrings() {
    return [
      '\n',
      ...Object.keys(this.userFlagsRef),
      ...this._getStringsFromTable(this.objectTable)
    ];
  }
};
