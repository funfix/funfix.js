# Funfix

<img src="https://funfix.org/public/logo/funfix-512.png" width="200" align="right" style="float:right; display: block; width:200px;" />

[![Travis](https://img.shields.io/travis/funfix/funfix.svg)](https://travis-ci.org/funfix/funfix)
[![Coverage Status](https://codecov.io/gh/funfix/funfix/coverage.svg?branch=master)](https://codecov.io/gh/funfix/funfix?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/funfix/funfix.svg)](https://greenkeeper.io/)
[![npm](https://img.shields.io/npm/v/funfix.svg)](https://www.npmjs.com/package/funfix)
[![Join chat](https://badges.gitter.im/funfix/funfix.svg)](https://gitter.im/funfix/funfix?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Funfix is a library of data types for functional and asynchronous
programming in Javascript.

Inspired by [Scala](http://www.scala-lang.org/), [Cats](http://typelevel.org/cats/)
and [Monix](https://monix.io/).

## Usage

```
npm install --save funfix
```

### Features Overview

The code is organized in ES2015 modules, but all types, 
classes and functions are exported by the 
[root module](https://funfix.org/api/modules/_funfix_.html).

**["core"](https://funfix.org/api/modules/_core_index_.html)** 
defines core data types and universal interfaces:

- **[Option&lt;A&gt;](https://funfix.org/api/classes/_core_disjunctions_.option.html)**: 
  data type for representing optional values, much like the "`Maybe`" 
  monadic type from Haskell or "`Option`" from Scala
- **[Either&lt;L,R&gt;](https://funfix.org/api/classes/_core_disjunctions_.either.html)**: 
  data type for representing disjoint unions, for working with values of 
  two possible types, inspired by the data type with the same name 
  from Haskell and Scala
- **[Try&lt;A&gt;](https://funfix.org/api/classes/_core_disjunctions_.try.html)**: 
  data type for capturing exceptional results and manipulating 
  them as values, being equivalent in spirit with `Either<Throwable, A>`,
  inspired by the data type with the same name from Scala
- **[core/errors](https://funfix.org/api/modules/_core_errors_.html)**: 
  sub-module that defines the standard `Error` types
- **[core/std](https://funfix.org/api/modules/_core_std_.html)**:
  sub-module that defines the `IEquals` interface for structural equality,
  along with other utilities

**["effect"](https://funfix.org/api/modules/_effect_index_.html)**
defines data types for dealing with side effects:

- **[Eval&lt;A&gt;](https://funfix.org/api/classes/_effect_eval_.eval.html)**: 
  data type for suspending synchronous side effects and controlling 
  evaluation (e.g. memoization, error handling)

**["types"](https://funfix.org/api/modules/_types_index_.html)** 
defines [type classes](https://en.wikipedia.org/wiki/Type_class)
inspired by Haskell's standard library and by 
[Typelevel Cats](http://typelevel.org/cats/):

- **[Eq](https://funfix.org/api/classes/_types_eq_.eq.html)**: 
  a type class for determining equality between instances of the 
  same type and that obeys the laws defined in 
  [EqLaws](https://funfix.org/api/classes/_types_eq_.eqlaws.html)
- **[Functor](https://funfix.org/api/classes/_types_functor_.functor.html)**:
  a type class exposing `map` and that obeys the laws defined in 
  [FunctorLaws](https://funfix.org/api/classes/_types_functor_.functorlaws.html)
- **[Apply](https://funfix.org/api/classes/_types_applicative_.apply.html)**:
  a type class that extends `Functor`, exposing `ap` and that obeys 
  the laws defined in 
  [ApplyLaws](https://funfix.org/api/classes/_types_apply_.applylaws.html)
- **[Applicative](https://funfix.org/api/classes/_types_applicative_.applicative.html)**:
  a type class that extends `Functor` and `Apply`, exposing `pure` 
  and that obeys the laws defined in 
  [ApplicativeLaws](https://funfix.org/api/classes/_types_applicative_.applicativelaws.html)
- **[FlatMap](https://funfix.org/api/classes/_types_monad_.flatmap.html)**:
  a type class that extends `Functor` and `Apply`, exposing `flatMap` 
  and `tailRecM` and that obeys the laws defined in 
  [FlatMapLaws](https://funfix.org/api/classes/_types_monad_.flatmaplaws.html)
- **[Monad](https://funfix.org/api/classes/_types_monad_.monad.html)**:
  a type class that extends `Applicative` and `FlatMap`
  and that obeys the laws defined in 
  [MonadLaws](https://funfix.org/api/classes/_types_monad_.monadlaws.html)
    
More is coming 😉

See **[API Docs](https://funfix.org/api)**.

### TypeScript or Flow?

Funfix supports both [TypeScript](https://www.typescriptlang.org/) and [Flow](https://flow.org/) type annotations out of the box.

It also makes the best use of the capabilities of each. For example TypeScript has bivariant generics, but Flow supports variance annotations and Funfix makes use of them. Development happens in TypeScript, due to better tooling, but both are first class citizens.

### Semantic versioning

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

