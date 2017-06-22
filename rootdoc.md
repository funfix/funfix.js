# Funfix

<img src="https://funfix.org/public/logo/funfix-512.png" width="120" align="right" style="float:right; display: block; width:120px;" />

Library of data types for functional and asynchronous programming in Javascript.

Inspired by [Scala](http://www.scala-lang.org/), [Cats](http://typelevel.org/cats/)
and [Monix](https://monix.io/).

## Usage

For adding the dependency to `package.json`:

```
npm install --save funfix
```

Usage sample:

```typescript
import {Try, Option, Either} from 'funfix'

const opt1 = Option.of("hello")
const opt2 = Try.of(() => "world").toOption()

const greeting =
  Option.map2(opt1, opt2, (a, b) => a + " " + b)

console.log(greeting.getOrElse("Ooops!"))
```

The library has been compiled using
[UMD (Universal Module Definition)](https://github.com/umdjs/umd),
so it should work with [CommonJS](http://requirejs.org/docs/commonjs.html)
and [AMD](http://requirejs.org/docs/whyamd.html).

À la carte imports using
[ECMAScript 2015 modules](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Statements/import)
is also possible:

```typescript
import { Option } from 'funfix/dist/core/option'

const opt = Option.of("hello")
```

Note that these à la carte imports (that you have to import from `dist`)
only work with a toolchain that recognizes ES2015 modules.

## Typescript, Flow support

Funfix supports both [Typescript](https://www.typescriptlang.org/)
and [Flow](https://flow.org/) out of the box, being packaged with
all necessary declaration files.

```typescript
import { Try } from 'funfix'

const email: ?string =
  Try.of(() => users[0].profile.email).orNull()
```

## Features

High-level data types:

- [Option](./classes/_core_option_.option.html),
  which is like the "Maybe" monadic type from Haskell
- [Either](./classes/_core_either_.either.html),
  for working with values of two possible types
- [Try](./classes/_core_try_.try.html),
  for capturing exceptional results and manipulating them as values
- [Eval](./classes/_effect_eval_.eval.html)
  for suspending synchronous side effects and controlling evaluation
  (e.g. memoization, error handling)

Low-level data types and utilities:

- [IEquals](./interfaces/_core_std_.iequals.html) interface
  for structural equality in [is](./modules/_core_std_.html#is)
- [Cancelable](./classes/_exec_cancelable_.cancelable.html) /
  [BoolCancelable](./classes/_exec_cancelable_.boolcancelable.html),
  for describing composable cancellation actions
- [TimeUnit and Duration](./modules/_exec_time_.html) for
  expressing timespans, along operations and conversions between time units

More is coming (e.g. `Task`, etc)
