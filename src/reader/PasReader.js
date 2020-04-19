const TokenReader = require('./TokenReader');

module.exports = class PasReader extends TokenReader {
  constructor(input) {
    super(input, /\n|;@line|;.*|\d+\.\d+|\w+:\w+|\w+#?\w*(\[\])?|(\.|::)?\w+:?|"(?:[^\\"]||\\.)*"/g);
  }

  read() {
    let next = this.peek();
    if (next && next.startsWith(';') && next.charAt(1) != '@') {
      super.read();
    }
    return super.read();
  }

  read1(name, EOL = true) {
    this.expect(name, false);
    let value = this.read();
    if (EOL) this.expectEOL();
    return value;
  }

  read2(name, EOL = true) {
    this.expect(name, false);
    let values = [this.read(), this.read()];
    if (EOL) this.expectEOL();
    return values;
  }

  readTable(name, of) {
    let tableEnd = `.end${name.charAt(0).toUpperCase() + name.slice(1)}Table`;
    let table = {};

    this.expect(`.${name}Table`);
    while (this.peek() != tableEnd) {
      let entry = of.readPas(this);
      table[entry.name] = entry;
    }
    this.expect(tableEnd);

    return table;
  }
}
