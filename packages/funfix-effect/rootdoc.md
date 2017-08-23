# funfix-effect

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="120" align="right" style="float:right; display: block; width:120px;" />
</a>

Sub-project of **[Funfix](https://funfix.org)** defining monadic data 
types for dealing with laziness and side effects.

## Contents

For suspending synchronous side-effects and functions that execute
immediately (no asynchronous boundaries):

- {@link Eval}: a lawful, lazy, monadic data type, that can control
  evaluation, inspired by the `Eval` type in 
  [Typelevel Cats](http://typelevel.org/cats/) and by the `Coeval`
  type in [Monix](https://monix.io), the equivalent of Haskell's `IO`, 
  but that can only handle immediate execution and not async boundaries.

N.B. an equivalent `Task` / `IO` type is coming 😉

## Usage

You can depend on the whole `funfix` library, by adding it to
`package.json`:

```bash
npm install --save funfix
```

In this case imports are like:

```typescript
import { Eval } from "funfix"
```

Or for finer grained dependency management, the project can depend
only on `funfix-effect`:

```bash
npm install --save funfix-effect
```

In this case imports are like:

```typescript
import { Future } from "funfix-effect"
```

Usage sample:

```typescript
import { Eval } from "funfix"

const f1 = Eval.of(() => "hello")
const f2 = Eval.of(() => "world")

const greeting = Eval.map2(f1, f2, (a, b) => a + " " + b)
console.info(greeting.get())
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
