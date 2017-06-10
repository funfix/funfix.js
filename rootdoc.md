# Funfix

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
import * as ff from 'funfix'

const opt = ff.Option.of("hello")
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
only work with a toolchain that recognizes ES2015 modules.
