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

### Features

High-level data types:

- [Option](https://funfix.org/api/classes/core_option.option.html),
  which is like the "Maybe" monadic type from Haskell
- [Either](https://funfix.org/api/classes/core_either.either.html),
  for working with values of two possible types
- [Try](https://funfix.org/api/classes/core_try.try.html),
  for capturing exceptional results and manipulating them as values
- [Eval](https://funfix.org/api/classes/effect_eval.eval.html)
  for suspending synchronous side effects and controlling evaluation
  (e.g. memoization, error handling)

Low-level data types and utilities:

- [IEquals](https://funfix.org/api/interfaces/core_std.iequals.html) interface
  for structural equality in [is](https://funfix.org/api/modules/core_std.html#is)
- [Cancelable](https://funfix.org/api/classes/exec_cancelable.cancelable.html) /
  [BoolCancelable](https://funfix.org/api/classes/exec_cancelable.boolcancelable.html),
  for describing composable cancellation actions
- [TimeUnit and Duration](https://funfix.org/api/modules/exec_time.html) for
  expressing timespans, along operations and conversions between time units

More is coming (e.g. `Task`, etc)

See **[API Docs](https://funfix.org/api)**.

### Typescript or Flow?

Funfix supports both [Typescript](https://www.typescriptlang.org/) and [Flow](https://flow.org/) type annotations out of the box.

It also makes the best use of the capabilities of each. For example Typescript has bivariant generics, but Flow supports variance annotations and Funfix makes use of them. Development happens in Typescript, due to better tooling, but both are first class citizens.

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

