# funfix-effect

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="200" align="right" style="float:right; display: block; width:200px;" />
</a>

[![Join chat](https://badges.gitter.im/funfix/funfix.svg)](https://gitter.im/funfix/funfix?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/v/funfix-effect.svg)](https://www.npmjs.com/package/funfix-effect)

Sub-project of **[Funfix](https://funfix.org)** defining monadic data
types for controlling laziness, asynchrony and side effects.

## Documentation

Links:

- [Homepage](https://funfix.org)
- **[JSDoc documentation](https://funfix.org/api/effect/)**

## Usage

You can depend on the whole `funfix` library, by adding it to
`package.json`:

```bash
npm install --save funfix
```

In this case imports are like:

```typescript
import { Eval, IO } from "funfix"
```

Or for finer grained dependency management, the project can depend
only on `funfix-effect`:

```bash
npm install --save funfix-effect
```

In this case imports are like:

```typescript
import { Eval, IO } from "funfix-effect"
```

Usage sample:

```typescript
import { IO } from "funfix"

const f1 = IO.of(() => "hello")
const f2 = IO.of(() => "world")

const greeting = IO.map2(f1, f2, (a, b) => a + " " + b)

greeting.run().onComplete(result =>
  result.fold(
    console.error,
    console.info
  ))
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
