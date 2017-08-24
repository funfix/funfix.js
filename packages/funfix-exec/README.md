# funfix-exec

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="200" align="right" style="float:right; display: block; width:200px;" />
</a>

[![Join chat](https://badges.gitter.im/funfix/funfix.svg)](https://gitter.im/funfix/funfix?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/v/funfix-exec.svg)](https://www.npmjs.com/package/funfix-exec)

Sub-project of **[Funfix](https://funfix.org)** containing low level,
side-effectful utilities and data types for building higher level
concurrency tools.

## Documentation

Links:

- [Homepage](https://funfix.org)
- **[JSDoc documentation](https://funfix.org/api/exec/)**

## Usage

You can depend on the whole `funfix` library, by adding it to
`package.json`:

```bash
npm install --save funfix
```

In this case imports are like:

```typescript
import { Future } from "funfix"
```

Or for finer grained dependency management, the project can depend
only on `funfix-exec`:

```bash
npm install --save funfix-exec
```

In this case imports are like:

```typescript
import { Future } from "funfix-exec"
```

Usage sample:

```typescript
import { Future } from "funfix"

const f1 = Future.of(() => "hello")
const f2 = Future.of(() => "world")

const greeting = Future.map2(f1, f2, (a, b) => a + " " + b)

greeting.onComplete(r => {
  r.fold(console.error, console.info)
})
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
