const PapyrusBase = require('./PapyrusBase');

module.exports = class PapyrusPropertyGroup extends PapyrusBase {
  constructor() {
    super();
    this.name = '';
    this.userFlags = 0;
    this.docString = '';
    this.properties = [];
  }

  asPas() {
    return `.propertyGroup ${this.name}\n` +
           `  .userFlags ${this.userFlags}\n` +
           `  .docString ${this.docString}\n` +
           this._indent(this.properties.map((p) => `.property ${p}`).join('\n'), 2) +
           `\n.endPropertyGroup`;
  }

  static readPas(tokens) {
    let group = new PapyrusPropertyGroup();

    tokens.expect('.propertyGroup', false);
    if (tokens.peek() != '\n') {
      group.name = tokens.read();
    } else {
      group.name = '';
    }
    tokens.expectEOL();

    group.userFlags = tokens.read1('.userFlags');
    group.docString = tokens.read1('.docString');
    group.properties = [];

    while (tokens.peek() != '.endPropertyGroup') {
      group.properties.push(tokens.read1('.property'));
    }
    tokens.expect('.endPropertyGroup');

    return group;
  }
}
