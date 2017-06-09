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

À la carte imports:

```typescript
import { Option } from 'funfix/dist/core/option'

const opt = Option.of("hello")
```

Note that these source files are not compiled for ES3 / ES5, so
they only work with a toolchain that recognizes ES2016 syntax.
