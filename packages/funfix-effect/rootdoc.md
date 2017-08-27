# funfix-effect

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="120" align="right" style="float:right; display: block; width:120px;" />
</a>

Sub-project of **[Funfix](https://funfix.org)** defining monadic data 
types for dealing with laziness and side effects.

## Contents

|              |                                                                                        |
|--------------|--------------------------------------------------------------------------------------- |
| [Eval]{@link Eval} | lawful, lazy, monadic data type, that can control evaluation, inspired by the `Eval` type in [Typelevel Cats](http://typelevel.org/cats/) and by the `Coeval` type in [Monix](https://monix.io), a more simple `IO`-like type that can only handle immediate execution, no async boundaries, no error handling, not being meant for suspending side effects. |
| [IO]{@link IO}   | lawful, lazy, monadic data type, capable of expressing and composing side effectful actions, including asynchronous, being the most potent and capable alternative to JavaScript's `Promise`, inspired by Haskell's `IO` and by the [Monix Task](https://monix.io/docs/2x/eval/task.html) |

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
