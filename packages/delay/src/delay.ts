/**
 * Copyright (C) 2022 Yonggang Luo <luoyonggang@gmail.com>
 *
 */

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class BBQ {

}
