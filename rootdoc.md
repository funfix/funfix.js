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
import {Try, Option, Either} from "funfix"

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
only work with a toolchain that recognizes ES2015 modules and imports.

## TypeScript, Flow support

Funfix supports both [TypeScript](https://www.typescriptlang.org/)
and [Flow](https://flow.org/) out of the box, being packaged with
all necessary declaration files.

```typescript
import { Try } from "funfix"

const email: string | null =
  Try.of(() => users[0].profile.email).orNull()
```

## Features Overview

The code is organized in ES2015 modules, but all types, classes and
functions are exported by the [root module]{@link "funfix"}.

**Sub-module ["core"]{@link "core/index"}** defines core
data types and universal interfaces:

- [Option&lt;A&gt;]{@link Option}: data type for representing optional values,
  much like the "`Maybe`" monadic type from Haskell or
  "`Option`" from Scala
- [Either&lt;L,R&gt;]{@link Either}: data type for representing disjoint unions,
  for working with values of two possible types,
  inspired by the data type with the same name from Haskell and Scala
- [Try&lt;A&gt;]{@link Try}**: data type for capturing exceptional results and manipulating 
  them as values, being equivalent in spirit with `Either&lt;Throwable, A&gt;`,
  inspired by the data type with the same name from Scala
- [core/errors]{@link "core/errors"}: sub-module that defines the 
  standard `Error` types
- [core/std]{@link "core/std"}: sub-module that defines the 
  [[IEquals]] interface for structural equality in [[is]] along with
  other utilities

**Sub-module ["effect"]{@link "effect/index"}** defines data types
for dealing with side effects:

- [Eval&lt;A&gt;]{@link Eval}: data type for suspending synchronous side 
  effects and controlling evaluation (e.g. memoization, error handling)

**Sub-module ["types"]{@link "types/index"}** defines
[type classes]{@link https://en.wikipedia.org/wiki/Type_class}
inspired by Haskell's standard library and by 
[Typelevel Cats]{@link http://typelevel.org/cats/}:

- [[Eq]]: a type class for determining equality between instances of the 
  same type and that obeys the laws defined in [[EqLaws]]
- [[Functor]]: a type class exposing [map]{@link Functor.map} and that 
  obeys the laws defined in [[FunctorLaws]]
- [[Apply]]: a type class that extends [[Functor]], that exposes
  [ap]{@link Apply.ap} and that obeys the laws defined in [[ApplyLaws]]
- [[Applicative]]: a type class that extends [[Functor]] and [[Apply]], 
  that exposes [pure]{@link Applicative.pure} and that obeys the laws 
  defined in [[ApplicativeLaws]]
  
More is coming 😉
