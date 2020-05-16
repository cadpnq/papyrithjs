# papyrith.js
Papyrus tooling written in JavaScript.


```
$ ./papyrith
papyrith <command> [args]

Commands:
  papyrith assemble <file>     assemble a pas file
  papyrith disassemble <file>  disassemble a pex file
  papyrith fix <file>          fix a file for decompilation with Champollion
  papyrith optimize <file>     optimize an existing pex file

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

# Commands
### assemble
Not currently implemented.

### disassemble
```
$ ./papyrith disassemble someScript.pex
```

### fix
```
$ ./papyrith fix someScript.pex
```
At the moment the only real use case is fixing scripts for decompilation. Champollion will often fail on scripts compiled with Caprica. The main culprit here is how Caprica handles temporary variables. It aggressively reuses them and Champollion does not expect this. Undoing this optimization will, for the most part, enable Champollion to understand the script. This is not a panacea - there are still cases where this alone will not be sufficient. In the future papyrith may handle these edge cases as they come up.

Additionally, papyrith verifies that the timestamps in the script fit in 32 bits. If the upper bits of the timestamps are set Champollion will fail.

It is not recommended that you load "fixed" scripts into your game. The deoptimization process will (potentially) introduce *many* additional temporary variables. The script will still function the same, but it's... gross.

### optimize
```
$ ./papyrith optimize someScript.pex
```
*highly experimental functionality -- not yet recommended for general use*

# Building
Clone the repo, run `npm install` followed by `npm run build`

# License
This project is licensed under the MIT License - see the [LICENSE](https://github.com/cadpnq/papyrithjs/blob/master/LICENSE) file for details
