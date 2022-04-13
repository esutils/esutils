import { AsyncSemaphore } from '@esutils/async-semaphore';

describe('AsyncSemaphore in typescript', () => {
  it('constructor', () => {
    expect(typeof AsyncSemaphore).toBe('function');
  });

  it('constructor instance', () => {
    expect(new AsyncSemaphore(1)).toBeInstanceOf(AsyncSemaphore);
  });

  it('semaphore(1)', async () => {
    const steps: string[] = [];
    const semaphore = new AsyncSemaphore(1);

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

    async function operation3() {
      steps.push('operation3.1');
      await semaphore.acquire();
      steps.push('operation3.2');
      await semaphore.release();
    }

    await Promise.all([operation1(), operation2(), operation3()]);
    expect(steps).toEqual([
      'operation1.1',
      'operation2.1',
      'operation3.1',
      'operation1.2',
      'operation2.2',
      'operation3.2',
    ]);
  });
});
