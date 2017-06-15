# Funfix

<img src="https://funfix.org/public/logo.png" width="100" align="right" style="float:right; display: block; width:100px;" />

[![Travis](https://img.shields.io/travis/alexandru/funfix.svg)](https://travis-ci.org/alexandru/funfix)
[![Coverage Status](https://coveralls.io/repos/github/alexandru/funfix/badge.svg?branch=master)](https://coveralls.io/github/alexandru/funfix?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm](https://img.shields.io/npm/v/funfix.svg)](https://www.npmjs.com/package/funfix)

Funfix is a library of data types for functional and asynchronous
programming in Javascript.

Inspired by [Scala](http://www.scala-lang.org/), [Cats](http://typelevel.org/cats/)
and [Funfix](https://Funfix.io/).

## Usage

```
npm install --save funfix
```

Features:

- [Option](https://funfix.org/api/classes/_core_option_.option.html),
  which is like the "Maybe" monadic type from Haskell
- [Either](https://funfix.org/api/classes/_core_either_.either.html),
  for working with values of two possible types
- [Try](https://funfix.org/api/classes/_core_try_.try.html),
  for capturing exceptional results and manipulating them as values
- [IEquals](https://funfix.org/api/interfaces/_core_std_.iequals.html) interface
  for structural equality in [is](https://funfix.org/api/modules/_core_std_.html#is)
- [Cancelable](https://funfix.org/api/classes/_exec_cancelable_.cancelable.html) /
  [BoolCancelable](https://funfix.org/api/classes/_exec_cancelable_.boolcancelable.html),
  for describing composable cancellation actions
- more is coming (e.g. `Eval`, `Task`)

See **[API Docs](https://funfix.org/api)**.

### Typescript or Flow?

Funfix supports both [Typescript](https://www.typescriptlang.org/)
and [Flow](https://flow.org/) out of the box.

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

