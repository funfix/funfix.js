# funfix-laws

<a href="https://funfix.org">
  <img src="https://funfix.org/public/logo/funfix-512.png" width="200" align="right" style="float:right; display: block; width:200px;" />
</a>

[![Join chat](https://badges.gitter.im/funfix/funfix.svg)](https://gitter.im/funfix/funfix?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/v/funfix-laws.svg)](https://www.npmjs.com/package/funfix-laws)

Sub-project of **[Funfix](https://funfix.org)** describing laws for testing
type class instances.

Note that the laws test for the type class modules as specified in
the [static-land](https://github.com/rpominov/static-land) specification,
therefore `funfix-laws` can be used to test for type class laws without
having to use the `funfix` library for anything else. 

## Documentation

Links:

- [Homepage](https://funfix.org)
- **[JSDoc documentation](https://funfix.org/api/laws/)**

## Usage

In comparisson with the other sub-projects of Funfix, the 
`funfix-laws` sub-project is NOT included in the main `funfix`
bundled. 

For usage in testing, the project can depend on `funfix-laws`:

```bash
npm install --save-dev funfix-laws
```

Note that these laws only make sense when doing property-based
testing, therefore [jsverify](https://github.com/jsverify/jsverify)
is currently recommended:

```bash
npm install --save-dev jsverify
```

The import is like this:

```typescript
import { SetoidLaws } from "funfix-laws"
```

At this time the project does not expose the necessary plumbing needed
for usage with `jsverify`, however samples are available in the project's
repository if inspiration is needed.

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

## License

Licensed under the Apache License, Version 2.0.
