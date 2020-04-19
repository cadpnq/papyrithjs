module.exports = class TokenReader {
  constructor(input, regex) {
    this.tokens = input.match(regex);
    this.line = 1;
  }

  peek() {
    return this.tokens[0];
  }

  read() {
    if (this.peek() == '\n') this.line++;
    return this.tokens.shift();
  }

  unread(token) {
    this.tokens.unshift(token);
  }

  expect(token, EOL = true) {
    let t = this.read();
    if (t == token) {
      if (EOL) this.expectEOL();
      return t;
    } else {
      throw `expected ${token} but got ${t} on line ${this.line}`;
    }
  }

  expectEOL() {
    let token = this.read();
    if (token != '\n' && token != undefined) {
      throw `expected EOL but got ${token} on line ${this.line}`;
    }
    while (this.peek() == '\n') {
      this.read();
    }
  }

  maybe(token) {
    if (this.peek() == token) {
      this.read();
      return true;
    } else {
      return false;
    }
  }
}
