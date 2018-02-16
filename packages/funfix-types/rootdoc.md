# funfix-types

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="120" align="right" style="float:right; display: block; width:120px;" />
</a>

Sub-project of **[Funfix](https://funfix.org)** exposing type classes,
inspired by Haskell and that follow the 
[static-land](https://github.com/rpominov/static-land) specification.

## Contents

Summary of available type classes:

|                          |                                                                                                                                                                         |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| {@link Setoid}           | type class for determining equality between instances of the same type and that obeys the laws defined in `SetoidLaws` (see `funfix-laws`)                              |

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

In this case the imports are like:

```typescript
import { Setoid } from "funfix"
```

Or for finer grained dependency management, the project can depend
only on `funfix-core`:

```bash
npm install --save funfix-core
```

In this case the imports are like:

```typescript
import { Setoid } from "funfix-types"
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
