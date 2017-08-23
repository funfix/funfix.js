# funfix-core

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="120" align="right" style="float:right; display: block; width:120px;" />
</a>

Sub-project of **[Funfix](https://funfix.org)**, exposing primitive
interfaces and data types that need to be universally available,
belonging into a standard library.

## Contents

Included are data types for expression disjunctions:

- {@link Either}: data type for expressing results with two possible
   outcome types (a disjoint union)
- {@link Option}: data type for expressing optional values
- {@link Try}: data type for representing the result of computations
  that may result in either success or failure

The core also includes tools for dealing with universal equality
and hash code generation:

- {@link IEquals} an interface for defining universal
  equality and hash code
- {@link is} and {@link equals} for using `IEquals` in tests, or
  otherwise falls back to JavaScript's equality (`==` or `valueOf()`)
- {@link hashCode} for calculating hash codes (for usage in sets
  and maps data structures) using `IEquals`, or otherwise falls back
  to calculating a hash from `.valueOf()` or from `.toString()`
- {@link isValueObject} for testing if a given object implements
  `IEquals`

Also exposes standard, reusable error types, that help with some common
scenarios, working with error types being preferable to working with
strings:

- {@link DummyError} for tagging errors used for testing purposes
- {@link IllegalArgumentError} for signaling that a given argument
  is violating the contract of the called function or constructor
- {@link IllegalInheritanceError} for signaling that inheriting
  from a certain class is illegal
- {@link IllegalStateError} for signaling that an illegal code branch
  was executed and thus something is wrong with the code and needs
  investigation (e.g. a bug)
- {@link NoSuchElementError} thrown when the user expects an element
  to be returned from a function call, but no such element exists
- {@link NotImplementedError} thrown in case an implementation
  is missing
- {@link TimeoutError} thrown in case the execution of a procedure
  takes longer than expected
- {@link CompositeError} for gathering multiple errors in a single
  reference that can expose them as a list

And misc utilities:

- {@link applyMixins} for working with mixins (i.e. classes used
  as interfaces, with methods that have default implementations),
  see [Mixins](https://www.typescriptlang.org/docs/handbook/mixins.html)
  for an explanation
- {@link id} is the "identity" function

## Usage

You can depend on the whole `funfix` library, by adding it to
`package.json`:

```bash
npm install --save funfix
```

In this case imports are like:

```typescript
import { Option } from "funfix"
```

Or for finer grained dependency management, the project can depend
only on `funfix-core`:

```bash
npm install --save funfix-core
```

In this case imports are like:

```typescript
import { Option } from "funfix-core"
```

Usage sample:

```typescript
import { Try, Option, Either } from "funfix"

const opt1 = Option.of("hello")
const opt2 = Try.of(() => "world").toOption()

const greeting =
  Option.map2(opt1, opt2, (a, b) => a + " " + b)

console.log(greeting.getOrElse("Ooops!"))
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
