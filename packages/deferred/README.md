
# A minimal `deferred` library that written in `typescript`

This deferred library can be used by `es` module, `commonjs` module and `typescript` module

## Examples

### Usage in `es` module, file with `.mjs` or `.js` extension

When `.js` extension used, the value of `module` property in `package.json`
should be `module`.

```js
import { Deferred } from '@esutils/deferred';

async function demo() {
  const defer = new Deferred();
  setTimeout(() => {
    defer.resolve();
  });
  console.log(`Start ${Date.now()}`);
  await defer.promise;
  console.log(`End ${Date.now()}`);
}

demo();

```

### Usage in `commonjs` module, file with `.cjs` or `.js` extension

When `.js` extension used, the value of `module` property in `package.json`
should be `commonjs` or not specified.

```js
const { Deferred } = require('@esutils/deferred');

async function demo() {
  const defer = new Deferred();
  setTimeout(() => {
    defer.resolve();
  });
  console.log(`Start ${Date.now()}`);
  await defer.promise;
  console.log(`End ${Date.now()}`);
}

demo();

```

### Usage in `typescript` module, file with `.ts` extension

```ts
import { Deferred } from '@esutils/deferred';

async function demo() {
  const defer = new Deferred<void>();
  setTimeout(() => {
    defer.resolve();
  });
  console.log(`Start ${Date.now()}`);
  await defer.promise;
  console.log(`End ${Date.now()}`);
}

demo();
```
