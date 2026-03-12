import path from 'path';
import { RunCommand } from '@esutils/run-command';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const examples_dir = path.join(__dirname, '..', 'examples');

describe('check cjs mjs js usage of async-semaphore', () => {
  it('require AsyncSemaphore in cjs', async () => {
    const result = await RunCommand('node', ['async-semaphore.demo.cjs'], {
      cwd: examples_dir,
    });
    expect(result.stdout.toString().trim()).toEqual('function');
  });

  it('import AsyncSemaphore in mjs', async () => {
    const result = await RunCommand('node', ['async-semaphore.demo.mjs'], {
      cwd: examples_dir,
    });
    expect(result.stdout.toString().trim()).toEqual('function');
  });

  it('require AsyncSemaphore in js with type: commonjs in package.json', async () => {
    const result = await RunCommand('node', ['async-semaphore.demo.js'], {
      cwd: examples_dir,
    });
    expect(result.stdout.toString().trim()).toEqual('function');
  });
});
