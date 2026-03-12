
# Runs a shell command and returns a Promise that resolves with the stdout/stderr as buffers in `typescript`

This async semaphore library can be used by `es` module, `commonjs` module and `typescript` module

## Examples

### Usage in `typescript` module, file with `.ts` extension

```ts
import { RunCommand } from '@esutils/run-command';

async function main() {
  const result = await RunCommand('node', ['-v']);
  console.log('stdout:', result.stdout.toString());
  console.log('stderr:', result.stderr.toString());
  if (result.error) {
    console.error('Error:', result.error);
  }
  console.log('Exit code:', result.code);
}

main().catch((error) => {
  console.error('Error:', error);
});
```

## Run example with yarn

```shell
yarn run -T ts-node run-command.demo.ts
```
