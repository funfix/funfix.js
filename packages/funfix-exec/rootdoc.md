# funfix-exec

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="120" align="right" style="float:right; display: block; width:120px;" />
</a>

Sub-project of **[Funfix](https://funfix.org)**, contains low level
utilities and data types for building higher level concurrency tools.

## Contents

For scheduling tasks for execution:

- {@link Future}, a lawful, fast, cancelable alternative to
  JavaScript's `Promise`
- {@link Scheduler}, the alternative to using `setTimeout` for
  asynchronous boundaries or delayed execution

In support for futures and schedulers, {@link ICancelable} data types
are introduced for dealing with cancellation concerns:

- {@link ICancelable} and {@link Cancelable} for expressing actions
  that can be triggered to cancel processes / dispose of resources
- {@link IBoolCancelable} and {@link BoolCancelable} for
  cancelable references that can be queried for their `isCanceled`
  status
- {@link IAssignCancelable} and {AssignCancelable} for cancelable
  references that can be assigned (behave like a box for) another
  reference
- {@link MultiAssignCancelable} being a mutable cancelable
  whose underlying reference can be updated multiple times
- {@link SingleAssignCancelable} for building forward references,
  much like `MultiAssignCancelable` except that it can be assigned
  only once, triggering an error on the second attempt
- {@link SerialCancelable} being like a `MultiAssignCancelable`
  that cancels its previous underlying reference on updates

And also types for expressing durations:

- {@link TimeUnit}, inspired by Java's own enumeration, representing
  time-related units of measurement
- {@link Duration}, inspired by Scala's own type, as a type safe
  representation for durations

## Usage

You can depend on the whole `funfix` library, by adding it to
`package.json`:

```bash
npm install --save funfix
```

In this case imports are like:

```typescript
import { Future } from "funfix"
```

Or for finer grained dependency management, the project can depend
only on `funfix-exec`:

```bash
npm install --save funfix-exec
```

In this case imports are like:

```typescript
import { Future } from "funfix-exec"
```

Usage sample:

```typescript
import { Future } from "funfix"

const f1 = Future.of(() => "hello")
const f2 = Future.of(() => "world")

const greeting = Future.map2(f1, f2, (a, b) => a + " " + b)

greeting.onComplete(r => {
  r.fold(console.error, console.info)
})
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
