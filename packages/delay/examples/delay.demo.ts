import { delay } from '@esutils/delay';

async function demo() {
  console.log(`Start ${Date.now()}`);
  await delay(100);
  console.log(`End ${Date.now()}`);
}

demo();
