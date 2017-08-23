# funfix-types

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="120" align="right" style="float:right; display: block; width:120px;" />
</a>

Sub-project of **[Funfix](https://funfix.org)**, exposes type classes
inspired by Haskell's standard library and by 
[Typelevel Cats](https://typelevel.org/cats/).

## Contents

Summary of type classes:

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

## Usage

You can depend on the whole `funfix` library, by adding it to
`package.json`:

```bash
npm install --save funfix
```

In this case imports are like:

```typescript
import { Monad } from "funfix"
```

Or for finer grained dependency management, the project can depend
only on `funfix-types`:

```bash
npm install --save funfix-types
```

In this case imports are like:

```typescript
import { Monad } from "funfix-types"
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
