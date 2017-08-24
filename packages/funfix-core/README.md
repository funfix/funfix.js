# funfix-core

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="200" align="right" style="float:right; display: block; width:200px;" />
</a>

[![Join chat](https://badges.gitter.im/funfix/funfix.svg)](https://gitter.im/funfix/funfix?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/v/funfix-core.svg)](https://www.npmjs.com/package/funfix-core)

Sub-project of **[Funfix](https://funfix.org)**, exposing primitive
interfaces and data types that need to be universally available,
belonging into a standard library.

## Documentation

Links:

- [Homepage](https://funfix.org)
- **[JSDoc documentation](https://funfix.org/api/core/)**

## Usage

You can depend on the whole `funfix` library, by adding it to
`package.json`:

```bash
npm install --save funfix
```

In this case imports are like:

```typescript
import { Option } from "funfix"
```

Or for finer grained dependency management, the project can depend
only on `funfix-core`:

```bash
npm install --save funfix-core
```

In this case imports are like:

```typescript
import { Option } from "funfix-core"
```

Usage sample:

```typescript
import { Try, Option, Either } from "funfix"

const opt1 = Option.of("hello")
const opt2 = Try.of(() => "world").toOption()

const greeting =
  Option.map2(opt1, opt2, (a, b) => a + " " + b)

console.log(greeting.getOrElse("Ooops!"))
```

### Modules: UMD and ES 2015

The library has been compiled using
[UMD (Universal Module Definition)](https://github.com/umdjs/umd),
so it should work with [CommonJS](http://requirejs.org/docs/commonjs.html)
and [AMD](http://requirejs.org/docs/whyamd.html).

But it also provides a `module` definition in `package.json`, thus
providing compatibility with
[ECMAScript 2015 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import), for usage when used with a modern JS engine,
or when bundling with a tool chain that understands ES2015 modules,
like [Rollup](https://rollupjs.org/) or [Webpack](https://webpack.js.org/).

## License

Licensed under the Apache License, Version 2.0.
