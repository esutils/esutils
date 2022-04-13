
# A minimal `async-semaphore` library that written in `typescript`

This async-semaphore library can be used by `es` module, `commonjs` module and `typescript` module

## Examples

### Usage in `typescript` module, file with `.ts` extension

```ts
import { AsyncSemaphore } from '@esutils/async-semaphore';

const semaphore = new AsyncSemaphore(1);
const steps: string[] = [];

async function operation1() {
  steps.push('operation1.1');
  await semaphore.acquire();
  steps.push('operation1.2');
  await semaphore.release();
}

async function operation2() {
  steps.push('operation2.1');
  await semaphore.acquire();
  steps.push('operation2.2');
  await semaphore.release();
}

async function demo() {
  await Promise.all([operation1(), operation2()]);
  console.log(steps);
}
demo();

```
