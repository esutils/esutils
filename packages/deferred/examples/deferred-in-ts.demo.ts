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
