# Funfix

<img src="https://funfix.org/public/logo/funfix-512.png" width="200" align="right" style="float:right; display: block; width:200px;" />

[![Travis](https://img.shields.io/travis/funfix/funfix.svg)](https://travis-ci.org/funfix/funfix)
[![Coverage Status](https://codecov.io/gh/funfix/funfix/coverage.svg?branch=master)](https://codecov.io/gh/funfix/funfix?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/funfix/funfix.svg)](https://greenkeeper.io/)
[![npm](https://img.shields.io/npm/v/funfix.svg)](https://www.npmjs.com/package/funfix)
[![Join chat](https://badges.gitter.im/funfix/funfix.svg)](https://gitter.im/funfix/funfix?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Funfix is a library of type classes and data types for Functional Programming 
in JavaScript, [TypeScript](https://www.typescriptlang.org/) and [Flow](https://flow.org/).

Inspired by [Scala](http://www.scala-lang.org/), [Cats](http://typelevel.org/cats/)
and [Monix](https://monix.io/).

## Usage

```
npm install --save funfix
```

## Features Overview

The code is organized in ES2015 modules, but all types, classes and
functions are exported by the root module.

### core

Data types for expressing disjunctions:

|                |                                                                                                    |
|----------------|----------------------------------------------------------------------------------------------------|
| [Either](https://funfix.org/api/classes/either.html) | data type for expressing results with two possible outcome types (a disjoint union)                |
| [Option](https://funfix.org/api/classes/option.html) | data type for expressing optional values                                                           |
| [Try](https://funfix.org/api/classes/try.html)       | data type for representing the result of computations that may result in either success or failure |

Standard interfaces and tools for dealing with universal equality and
hash code generation:

|                               |                                                                                                    |
|-------------------------------|----------------------------------------------------------------------------------------------------|
| [IEquals](https://funfix.org/api/interfaces/iequals.html)                | an interface for defining universal equality and hash code                                                         |
| [is](https://funfix.org/api/globals.html#is) and [equals](https://funfix.org/api/globals.html#equals) | for using `IEquals` in tests, or otherwise falls back to JavaScript's equality (`==` or `valueOf()`) |
| [hashCode](https://funfix.org/api/globals.html#hashCode)              | for calculating hash codes (for usage in sets and maps data structures) using `IEquals`, or otherwise falls back to calculating a hash from `.valueOf()` or from `.toString()` |
| [isValueObject](https://funfix.org/api/globals.html#isValueObject)    | for testing if a given object implements `IEquals` |
  
Also exposes standard, reusable error types, that help with some common
scenarios, working with error types being preferable to working with
strings:

|                                 |                                                                                                    |
|---------------------------------|----------------------------------------------------------------------------------------------------|
| [DummyError](https://funfix.org/api/classes/dummyerror.html)              | for tagging errors used for testing purposes |
| [IllegalArgumentError](https://funfix.org/api/classes/illegalargumenterror.html)    | for signaling that a given argument is violating the contract of the called function or constructor |
| [IllegalInheritanceError](https://funfix.org/api/classes/illegalinheritanceerror.html) | for signaling that inheriting from a certain class is illegal |
| [IllegalStateError](https://funfix.org/api/classes/illegalstateerror.html)       | for signaling that an illegal code branch was executed and thus something is wrong with the code and needs investigation (e.g. a bug) |
| [NoSuchElementError](https://funfix.org/api/classes/nosuchelementerror.html)      | thrown when the user expects an element to be returned from a function call, but no such element exists |
| [NotImplementedError](https://funfix.org/api/classes/notimplementederror.html)     | thrown in case an implementation is missing |
| [TimeoutError](https://funfix.org/api/classes/timeouterror.html)            | thrown in case the execution of a procedure takes longer than expected |
| [CompositeError](https://funfix.org/api/classes/compositeerror.html)          | for gathering multiple errors in a single reference that can expose them as a list |

Misc utilities:

|                                 |                                                                                                    |
|---------------------------------|----------------------------------------------------------------------------------------------------|
| [applyMixins](https://funfix.org/api/globals.html#applyMixins)    | for working with mixins (i.e. classes used as interfaces, with methods that have default implementations), see [Mixins](https://www.typescriptlang.org/docs/handbook/mixins.html) for an explanation |
| [id](https://funfix.org/api/globals.html#id)                      | is the "identity" function                                                                         |

### exec

Scheduling tasks for asynchronous execution:

|                   |                                                                                        |
|-------------------|--------------------------------------------------------------------------------------- |
| [Future](https://funfix.org/api/classes/future.html)    | a lawful, fast, cancelable alternative to JavaScript's `Promise`                       |
| [Scheduler](https://funfix.org/api/classes/scheduler.html) | the alternative to using `setTimeout` for asynchronous boundaries or delayed execution |

In support for futures and schedulers, [ICancelable](https://funfix.org/api/interfaces/icancelable.html) data types
are introduced for dealing with cancellation concerns:

|                                                    |                                                                                        |
|----------------------------------------------------|--------------------------------------------------------------------------------------- |
| [ICancelable](https://funfix.org/api/interfaces/icancelable.html) and [Cancelable](https://funfix.org/api/classes/cancelable.html)         | for expressing actions that can be triggered to cancel processes / dispose of resources |
| [IBoolCancelable](https://funfix.org/api/interfaces/iboolcancelable.html) and [BoolCancelable](https://funfix.org/api/classes/boolcancelable.html) | for cancelable references that can be queried for their `isCanceled` status |
| [IAssignCancelable](https://funfix.org/api/interfaces/iassigncancelable.html) and [AssignCancelable](https://funfix.org/api/classes/assigncancelable.html)   | for cancelable references that can be assigned (behave like a box for) another reference |
| [MultiAssignCancelable](https://funfix.org/api/classes/multiassigncancelable.html)   | being a mutable cancelable whose underlying reference can be updated multiple times |
| [SingleAssignCancelable](https://funfix.org/api/classes/singleassigncancelable.html) | for building forward references, much like `MultiAssignCancelable` except that it can be assigned only once, triggering an error on the second attempt |
| [SerialCancelable](https://funfix.org/api/classes/serialcancelable.html)             | being like a `MultiAssignCancelable` that cancels its previous underlying reference on updates |

And also types for expressing durations:

|                  |                                                                                        |
|------------------|--------------------------------------------------------------------------------------- |
| [TimeUnit](https://funfix.org/api/classes/timeunit.html) | inspired by Java's own enumeration, representing time| elated units of measurement     |
| [Duration](https://funfix.org/api/classes/duration.html) | inspired by Scala's own type, as a type safe representation for durations              |

### effect

For suspending synchronous side-effects and functions that execute
immediately (no asynchronous boundaries):

|              |                                                                                        |
|--------------|--------------------------------------------------------------------------------------- |
| [Eval](https://funfix.org/api/classes/eval.html) | a lawful, lazy, monadic data type, that can control evaluation, inspired by the `Eval` type in [Typelevel Cats](http://typelevel.org/cats/) and by the `Coeval` type in [Monix](https://monix.io), the equivalent of Haskell's `IO`, but that can only handle immediate execution and not async boundaries. |

N.B. an equivalent `Task` / `IO` type is coming 😉

### types

[Type classes](https://en.wikipedia.org/wiki/Type_class)
inspired by Haskell's standard library and by 
[Typelevel Cats](https://typelevel.org/cats/):

|                          |                                                                                                                                                                           |
|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Eq](https://funfix.org/api/classes/eq.html)                   | a type class for determining equality between instances of the same type and that obeys the laws defined in [EqLaws](https://funfix.org/api/classes/eqlaws.html)                                                |
| [Functor](https://funfix.org/api/classes/functor.html)         | a type class exposing `map` and that obeys the laws defined in [FunctorLaws](https://funfix.org/api/classes/functorlaws.html)                                                                                        |
| [Apply](https://funfix.org/api/classes/apply.html)             | a type class that extends `Functor`, exposing `ap` and that obeys the laws defined in [ApplyLaws](https://funfix.org/api/classes/applylaws.html)                                                                   |
| [Applicative](https://funfix.org/api/classes/applicative.html) | a type class that extends `Functor` and `Apply`, exposing `pure` and that obeys the laws defined in [ApplicativeLaws](https://funfix.org/api/classes/applicativelaws.html)                                               |
| [ApplicativeError](https://funfix.org/api/classes/applicativeerror.html) | a type class that extends `Applicative`, for applicative types that can raise errors or recover from them and that obeys the laws defined in [ApplicativeErrorLaws](https://funfix.org/api/classes/applicativeerrorlaws.html) | 
| [FlatMap](https://funfix.org/api/classes/flatmap.html)         | a type class that extends `Functor` and `Apply`, exposing `flatMap` and `tailRecM` and that obeys the laws defined in [FlatMapLaws](https://funfix.org/api/classes/flatmaplaws.html)                                 |
| [Monad](https://funfix.org/api/classes/monad.html)             | a type class that extends `Applicative` and `FlatMap` and that obeys the laws defined in [MonadLaws](https://funfix.org/api/classes/monadlaws.html)                                                                |
| [MonadError](https://funfix.org/api/classes/monaderror.html)   | a type class that extends `ApplicativeError` and `Monad`, for monads that can raise or recover from errors and that obeys the laws defined in [MonadErrorLaws](https://funfix.org/api/classes/monaderrorlaws.html)      |
  
More is coming 😉

## TypeScript or Flow?

Funfix supports both [TypeScript](https://www.typescriptlang.org/) and [Flow](https://flow.org/) type annotations out of the box.

It also makes the best use of the capabilities of each. For example TypeScript has bivariant generics, but Flow supports variance annotations and Funfix makes use of them. Development happens in TypeScript, due to better tooling, but both are first class citizens.

## Semantic versioning

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

Funfix versioning follows the [sematic versioning (semver)](http://semver.org/) specification, meaning that versions have the `$major.$minor.$patch` format, where any `$major` increment means that a breaking change happened. It's also configured with a fully automated release process, triggered by any commits on master.

## Recommended Companions

Projects for usage in combination with Funfix:

- [Immutable.js](https://facebook.github.io/immutable-js/):
  a library exposing immutable collections, by Facebook
- [JSVerify](https://jsverify.github.io/):
  property based testing

## Contributing

The Funfix project welcomes contributions from anybody wishing to
participate.  All code or documentation that is provided must be
licensed with the same license that Funfix is licensed with (Apache
2.0).

Feel free to open an issue if you notice a bug, have an idea for a
feature, or have a question about the code. Pull requests are also
gladly accepted. For more information, check out the
[contributor guide](CONTRIBUTING.md).

## License

All code in this repository is licensed under the Apache License,
Version 2.0.  See [LICENCE](./LICENSE).

