# Funfix

<img src="https://funfix.org/public/logo/funfix-512.png" width="200" align="right" style="float:right; display: block; width:200px;" />

[![npm](https://img.shields.io/npm/v/funfix.svg)](https://www.npmjs.com/package/funfix)
[![Join chat](https://badges.gitter.im/funfix/funfix.svg)](https://gitter.im/funfix/funfix?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Funfix is a library of type classes and data types for Functional Programming 
in JavaScript, [TypeScript](https://www.typescriptlang.org/) and [Flow](https://flow.org/).

Inspired by [Scala](http://www.scala-lang.org/), [Cats](http://typelevel.org/cats/)
and [Monix](https://monix.io/).

## Usage

The code is organized in sub-projects, for à la carte dependencies,
but all types, classes and functions are exported by `funfix`, so to
import everything:

```
npm install --save funfix
```

Or you can depend on individual sub-projects, see below.

### Modules: UMD and ES 2015

The library has been compiled using
[UMD (Universal Module Definition)](https://github.com/umdjs/umd),
so it should work with [CommonJS](http://requirejs.org/docs/commonjs.html)
and [AMD](http://requirejs.org/docs/whyamd.html), for standalone usage
in browsers or Node.js.

But it also provides a `module` definition in `package.json`, thus
providing compatibility with
[ECMAScript 2015 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import),
for usage when used with a modern JS engine, or when bundling with a
tool chain that understands ES2015 modules,
like [Rollup](https://rollupjs.org/)
or [Webpack](https://webpack.js.org/).

## Sub-projects

Funfix has been split in multiple sub-projects for à la carte
dependency management.  As mentioned above, you can depend on
everything by depending on the `funfix` project. 

These sub-projects are:

### funfix-core 
[![npm](https://img.shields.io/npm/v/funfix-core.svg)](https://www.npmjs.com/package/funfix-core)

Exposes primitive interfaces and data types that need to be
universally available, belonging into a standard library.

**[See JSDoc documentation](https://funfix.org/api/core/)**.

#### Quick Overview &amp; Usage

```
npm install --save funfix-core
```

Exposes types for expressing disjunctions:

|                |                                                                                                    |
|----------------|----------------------------------------------------------------------------------------------------|
| [Either](https://funfix.org/api/core/classes/either.html) | data type for expressing results with two possible outcome types (a disjoint union)                |
| [Option](https://funfix.org/api/core/classes/option.html) | data type for expressing optional values                                                           |
| [Try](https://funfix.org/api/core/classes/try.html)       | data type for representing the result of computations that may result in either success or failure |

Standard interfaces and tools for dealing with universal equality and
hash code generation:

|                               |                                                                                                    |
|-------------------------------|----------------------------------------------------------------------------------------------------|
| [IEquals](https://funfix.org/api/core/interfaces/iequals.html)                | an interface for defining universal equality and hash code                                                         |
| [is](https://funfix.org/api/core/globals.html#is) and [equals](https://funfix.org/api/core/globals.html#equals) | for using `IEquals` in tests, or otherwise falls back to JavaScript's equality (`==` or `valueOf()`) |
| [hashCode](https://funfix.org/api/core/globals.html#hashCode)              | for calculating hash codes (for usage in sets and maps data structures) using `IEquals`, or otherwise falls back to calculating a hash from `.valueOf()` or from `.toString()` |
| [isValueObject](https://funfix.org/api/core/globals.html#isValueObject)    | for testing if a given object implements `IEquals` |
  
Standard, reusable error types, that help with some common scenarios,
working with error types being preferable to working with strings:

|                                 |                                                                                                    |
|---------------------------------|----------------------------------------------------------------------------------------------------|
| [DummyError](https://funfix.org/api/core/classes/dummyerror.html)              | for tagging errors used for testing purposes |
| [IllegalArgumentError](https://funfix.org/api/core/classes/illegalargumenterror.html)    | for signaling that a given argument is violating the contract of the called function or constructor |
| [IllegalInheritanceError](https://funfix.org/api/core/classes/illegalinheritanceerror.html) | for signaling that inheriting from a certain class is illegal |
| [IllegalStateError](https://funfix.org/api/core/classes/illegalstateerror.html)       | for signaling that an illegal code branch was executed and thus something is wrong with the code and needs investigation (e.g. a bug) |
| [NoSuchElementError](https://funfix.org/api/core/classes/nosuchelementerror.html)      | thrown when the user expects an element to be returned from a function call, but no such element exists |
| [NotImplementedError](https://funfix.org/api/core/classes/notimplementederror.html)     | thrown in case an implementation is missing |
| [TimeoutError](https://funfix.org/api/core/classes/timeouterror.html)            | thrown in case the execution of a procedure takes longer than expected |
| [CompositeError](https://funfix.org/api/core/classes/compositeerror.html)          | for gathering multiple errors in a single reference that can expose them as a list |

Misc utilities:

|                                 |                                                                                                    |
|---------------------------------|----------------------------------------------------------------------------------------------------|
| [applyMixins](https://funfix.org/api/core/globals.html#applyMixins)    | for working with mixins (i.e. classes used as interfaces, with methods that have default implementations), see [Mixins](https://www.typescriptlang.org/docs/handbook/mixins.html) for an explanation |
| [id](https://funfix.org/api/core/globals.html#id)                      | is the "identity" function                                                                         |

### funfix-exec 
[![npm](https://img.shields.io/npm/v/funfix-exec.svg)](https://www.npmjs.com/package/funfix-exec)

Contains low level / side-effectful utilities and data types for
building higher level concurrency tools.

**[See JSDoc documentation](https://funfix.org/api/exec/)**.

#### Quick Overview &amp; Usage

```
npm install --save funfix-exec
```

Scheduling tasks for asynchronous execution:

|                   |                                                                                        |
|-------------------|--------------------------------------------------------------------------------------- |
| [Future](https://funfix.org/api/exec/classes/future.html)    | a lawful, fast, cancelable alternative to JavaScript's `Promise`                       |
| [Scheduler](https://funfix.org/api/exec/classes/scheduler.html) | the alternative to using `setTimeout` for asynchronous boundaries or delayed execution |

In support of futures and schedulers,
[ICancelable](https://funfix.org/api/exec/interfaces/icancelable.html)
data types are introduced for dealing with cancellation concerns:

|                                                    |                                                                                        |
|----------------------------------------------------|--------------------------------------------------------------------------------------- |
| [ICancelable](https://funfix.org/api/exec/interfaces/icancelable.html) and [Cancelable](https://funfix.org/api/exec/classes/cancelable.html)         | for expressing actions that can be triggered to cancel processes / dispose of resources |
| [IBoolCancelable](https://funfix.org/api/exec/interfaces/iboolcancelable.html) and [BoolCancelable](https://funfix.org/api/exec/classes/boolcancelable.html) | for cancelable references that can be queried for their `isCanceled` status |
| [IAssignCancelable](https://funfix.org/api/exec/interfaces/iassigncancelable.html) and [AssignCancelable](https://funfix.org/api/exec/classes/assigncancelable.html)   | for cancelable references that can be assigned (behave like a box for) another reference |
| [MultiAssignCancelable](https://funfix.org/api/exec/classes/multiassigncancelable.html)   | being a mutable cancelable whose underlying reference can be updated multiple times |
| [SingleAssignCancelable](https://funfix.org/api/exec/classes/singleassigncancelable.html) | for building forward references, much like `MultiAssignCancelable` except that it can be assigned only once, triggering an error on the second attempt |
| [SerialCancelable](https://funfix.org/api/exec/classes/serialcancelable.html)             | being like a `MultiAssignCancelable` that cancels its previous underlying reference on updates |

And also types for expressing durations:

|                  |                                                                                        |
|------------------|--------------------------------------------------------------------------------------- |
| [TimeUnit](https://funfix.org/api/exec/classes/timeunit.html) | inspired by Java's own enumeration, representing time| elated units of measurement     |
| [Duration](https://funfix.org/api/exec/classes/duration.html) | inspired by Scala's own type, as a type safe representation for durations              |

### funfix-effect 
[![npm](https://img.shields.io/npm/v/funfix-effect.svg)](https://www.npmjs.com/package/funfix-effect)

Defines monadic data types for controlling laziness, asynchrony and side effects.
Exposes the most advanced `IO` implementation for JavaScript.

**[See JSDoc documentation](https://funfix.org/api/effect/)**.

#### Quick Overview &amp; Usage

```
npm install --save funfix-effect
```

The exposed data types:

|              |                                                                                        |
|--------------|--------------------------------------------------------------------------------------- |
| [Eval](https://funfix.org/api/effect/classes/eval.html) | lawful, lazy, monadic data type, that can control evaluation, inspired by the `Eval` type in [Typelevel Cats](http://typelevel.org/cats/) and by the `Coeval` type in [Monix](https://monix.io), a more simple `IO`-like type that can only handle immediate execution, no async boundaries, no error handling, not being meant for suspending side effects. |
| [IO](https://funfix.org/api/effect/classes/io.html)     | lawful, lazy, monadic data type, capable of expressing and composing side effectful actions, including asynchronous, being the most potent and capable alternative to JavaScript's `Promise`, inspired by Haskell's `IO` and by the [Monix Task](https://monix.io/docs/2x/eval/task.html) |

## TypeScript or Flow?

Funfix supports both [TypeScript](https://www.typescriptlang.org/)
and [Flow](https://flow.org/) type annotations out of the box.

It also makes the best use of the capabilities of each. For example
TypeScript has bivariant generics, but Flow supports variance
annotations and Funfix makes use of them. Development happens in
TypeScript, due to better tooling, but both are first class citizens.

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
