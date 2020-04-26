const PapyrusBase = require('./PapyrusBase');
const PapyrusFunction = require('./PapyrusFunction');

module.exports = class PapyrusProperty extends PapyrusBase {
  constructor() {
    super();
    this.name = '';
    this.type = '';
    this.auto = false;
    this.userFlags = 0;
    this.docString = '""';
    this.autoVar = '';
    this.Get;
    this.Set;
  }

  asPas() {
    return `.property ${this.name} ${this.type} ${this.auto ? 'auto' : ''}\n` +
           `  .userFlags ${this.userFlags}\n` +
           `  .docString ${this.docString} ${this.auto ? `\n  .autoVar ${this.autoVar}` : ''}\n` +
           `${this.Get ? `${this._indent(this.Get.asPas(), 2)}\n` : ''}` +
           `${this.Set ? `${this._indent(this.Set.asPas(), 2)}\n` : ''}` +
           `.endProperty`;
  }

  static readPex(pex) {
    let property = new PapyrusProperty();

    property.name = pex.readTableString();
    property.type = pex.readTableString();
    property.docString = pex.readTableString(true);
    property.userFlags = pex.readUInt32();
    let flags = pex.readUInt8();

    if (flags & 4) {
      property.auto = true;
      property.autoVar = pex.readTableString();
    } else {
      if ((flags & 1) == 1) {
        let getter = PapyrusFunction.readPex(pex, false);
        getter.name = 'Get';
        property.Get = getter;
      }

      if ((flags & 2) == 2) {
        let setter = PapyrusFunction.readPex(pex, false);
        setter.name = 'Set';
        property.Set = setter;
      }
    }

    return property;
  }

  static readPas(tokens) {
    let property = new PapyrusProperty();
    let [name, type] = tokens.read2('.property', false);
    property.name = name;
    property.type = type;

    property.auto = tokens.maybe('auto');
    tokens.expectEOL();

    property.userFlags = tokens.read1('.userFlags');
    property.docString = tokens.read1('.docString');

    if (property.auto) {
      property.autoVar = tokens.read1('.autoVar');
    }

    while (tokens.peek() == '.function') {
      let func = PapyrusFunction.readPas(tokens);
      property[func.name] = func;
    }

    tokens.expect('.endProperty');

    return property;
  }
}
