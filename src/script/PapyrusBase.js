module.exports = class PapyrusBase {
  constructor() {
  }

  _indent(what, depth = 2) {
    return what.replace(/^/gm, ' '.repeat(depth));
  }

  _printTable(table, indentation = 2) {
    return this._indent(Object.values(table).map((o) => o.asPas()).join('\n'), indentation)
  }

  _printSimpleTable(table, of, indentation) {
    return this._indent(Object.entries(table).map(([name, type]) => `${of} ${name} ${type}`).join('\n'), indentation);
  }
}
