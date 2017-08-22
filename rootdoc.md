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
functions are exported by the root module.

### core

Data types for expressing disjunctions:

|                |                                                                                                    |
|----------------|----------------------------------------------------------------------------------------------------|
| {@link Either} | data type for expressing results with two possible outcome types (a disjoint union)                |
| {@link Option} | data type for expressing optional values                                                           |
| {@link Try}    | data type for representing the result of computations that may result in either success or failure |

Standard interfaces and tools for dealing with universal equality and
hash code generation:

|                               |                                                                                                    |
|-------------------------------|----------------------------------------------------------------------------------------------------|
| {@link IEquals}               | an interface for defining universal equality and hash code                                                         |
| {@link is} and {@link equals} | for using `IEquals` in tests, or otherwise falls back to JavaScript's equality (`==` or `valueOf()`) |
| {@link hashCode}              | for calculating hash codes (for usage in sets and maps data structures) using `IEquals`, or otherwise falls back to calculating a hash from `.valueOf()` or from `.toString()` |
| {@link isValueObject}         | for testing if a given object implements `IEquals` |
  
Also exposes standard, reusable error types, that help with some common
scenarios, working with error types being preferable to working with
strings:

|                                 |                                                                                                    |
|---------------------------------|----------------------------------------------------------------------------------------------------|
| {@link DummyError}              | for tagging errors used for testing purposes |
| {@link IllegalArgumentError}    | for signaling that a given argument is violating the contract of the called function or constructor |
| {@link IllegalInheritanceError} | for signaling that inheriting from a certain class is illegal |
| {@link IllegalStateError}       | for signaling that an illegal code branch was executed and thus something is wrong with the code and needs investigation (e.g. a bug) |
| {@link NoSuchElementError}      | thrown when the user expects an element to be returned from a function call, but no such element exists |
| {@link NotImplementedError}     | thrown in case an implementation is missing |
| {@link TimeoutError}            | thrown in case the execution of a procedure takes longer than expected |
| {@link CompositeError}          | for gathering multiple errors in a single reference that can expose them as a list |

Misc utilities:

|                                 |                                                                                                    |
|---------------------------------|----------------------------------------------------------------------------------------------------|
| {@link applyMixins}             | for working with mixins (i.e. classes used as interfaces, with methods that have default implementations), see [Mixins](https://www.typescriptlang.org/docs/handbook/mixins.html) for an explanation |
| {@link id}                      | is the "identity" function                                                                         |

### exec

Scheduling tasks for asynchronous execution:

|                   |                                                                                        |
|-------------------|--------------------------------------------------------------------------------------- |
| {@link Future}    | a lawful, fast, cancelable alternative to JavaScript's `Promise`                       |
| {@link Scheduler} | the alternative to using `setTimeout` for asynchronous boundaries or delayed execution |

In support for futures and schedulers, {@link ICancelable} data types
are introduced for dealing with cancellation concerns:

|                                                    |                                                                                        |
|----------------------------------------------------|--------------------------------------------------------------------------------------- |
| {@link ICancelable} and {@link Cancelable}         | for expressing actions that can be triggered to cancel processes / dispose of resources |
| {@link IBoolCancelable} and {@link BoolCancelable} | for cancelable references that can be queried for their `isCanceled` status |
| {@link IAssignCancelable} and {AssignCancelable}   | for cancelable references that can be assigned (behave like a box for) another reference |
| {@link MultiAssignCancelable}                      | being a mutable cancelable whose underlying reference can be updated multiple times |
| {@link SingleAssignCancelable}                     | for building forward references, much like `MultiAssignCancelable` except that it can be assigned only once, triggering an error on the second attempt |
| {@link SerialCancelable}                           | being like a `MultiAssignCancelable` that cancels its previous underlying reference on updates |

And also types for expressing durations:

|                  |                                                                                        |
|------------------|--------------------------------------------------------------------------------------- |
| {@link TimeUnit} | inspired by Java's own enumeration, representing time| elated units of measurement     |
| {@link Duration} | inspired by Scala's own type, as a type safe representation for durations              |

### effect

For suspending synchronous side-effects and functions that execute
immediately (no asynchronous boundaries):

|              |                                                                                        |
|--------------|--------------------------------------------------------------------------------------- |
| {@link Eval} | a lawful, lazy, monadic data type, that can control evaluation, inspired by the `Eval` type in [Typelevel Cats](http://typelevel.org/cats/) and by the `Coeval` type in [Monix](https://monix.io), the equivalent of Haskell's `IO`, but that can only handle immediate execution and not async boundaries. |

N.B. an equivalent `Task` / `IO` type is coming 😉

### types

[Type classes]{@link https://en.wikipedia.org/wiki/Type_class}
inspired by Haskell's standard library and by 
[Typelevel Cats]{@link http://typelevel.org/cats/}:

|                          |                                                                                                                                                                           |
|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| {@link Eq}               | a type class for determining equality between instances of the same type and that obeys the laws defined in {@link EqLaws}                                                |
| {@link Functor}          | a type class exposing `map` and that obeys the laws defined in {@link FunctorLaws}                                                                                        |
| {@link Apply}            | a type class that extends `Functor`, exposing `ap` and that obeys the laws defined in {@link ApplyLaws}                                                                   |
| {@link Applicative}      | a type class that extends `Functor` and `Apply`, exposing `pure` and that obeys the laws defined in {@link ApplicativeLaws}                                               |
| {@link ApplicativeError} | a type class that extends `Applicative`, for applicative types that can raise errors or recover from them and that obeys the laws defined in {@link ApplicativeErrorLaws} | 
| {@link FlatMap}          | a type class that extends `Functor` and `Apply`, exposing `flatMap` and `tailRecM` and that obeys the laws defined in {@link FlatMapLaws}                                 |
| {@link Monad}            | a type class that extends `Applicative` and `FlatMap` and that obeys the laws defined in {@link MonadLaws}                                                                |
| {@link MonadError}       | a type class that extends `ApplicativeError` and `Monad`, for monads that can raise or recover from errors and that obeys the laws defined in {@link MonadErrorLaws}      |
  
More is coming 😉

## Contributing

The Funfix project welcomes contributions from anybody wishing to
participate.  All code or documentation that is provided must be
licensed with the same license that Funfix is licensed with (Apache
2.0, see LICENSE.txt).

Feel free to open an issue if you notice a bug, have an idea for a
feature, or have a question about the code. Pull requests are also
gladly accepted. 

See the project's [GitHub Repository](https://github.com/funfix/funfix).

## License

All code in this repository is licensed under the Apache License,
Version 2.0.
