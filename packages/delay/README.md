
# A minimal delay/sleep library that implemented in `typescript`

This `delay` library can be used by `es` module, `commonjs` module and `typescript` module.
`delay` are used to async sleep or delay some time.

## Examples

### Usage in `typescript` module, file with `.ts` extension

```ts
import { delay } from '@esutils/delay';

async function demo() {
  console.log(`Start ${Date.now()}`);
  await delay(100);
  console.log(`End ${Date.now()}`);
}

demo();
```
