/**
 * Copyright (C) 2022 Yonggang Luo <luoyonggang@gmail.com>
 *
 */

 type PromiseResolveFunction<T> = (value: T | PromiseLike<T>) => void;

export class AsyncSemaphore {
  private readonly count: number;

  private n: number = 0;

  private acquireFifo: PromiseResolveFunction<void>[] = [];

  private releaseFifo: PromiseResolveFunction<void>[] = [];

  public constructor(count: number) {
    this.count = count;
  }

  public async acquire(first: boolean = false): Promise<void> {
    if (this.tryAcquire()) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      if (first) {
        this.acquireFifo.unshift(resolve);
      } else {
        this.acquireFifo.push(resolve);
      }
    });
  }

  public tryAcquire(): boolean {
    if (this.releaseFifo.length > 0) {
      this.releaseFifo.shift()!();
      return true;
    }
    if (this.n < this.count) {
      this.n += 1;
      return true;
    }
    return false;
  }

  public tryAcquireAll(): boolean {
    const ret = this.releaseFifo.length > 0 || this.n < this.count;
    const existReleaseFifo = this.releaseFifo;
    this.releaseFifo = [];
    for (let i = 0; i < existReleaseFifo.length; i += 1) {
      existReleaseFifo[i]();
    }
    this.n = this.count;
    return ret;
  }

  public async release(first: boolean = false): Promise<void> {
    /* never less than zero */
    if (this.tryRelease()) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      if (first) {
        this.releaseFifo.unshift(resolve);
      } else {
        this.releaseFifo.push(resolve);
      }
    });
  }

  public tryRelease(): boolean {
    if (this.acquireFifo.length > 0) {
      this.acquireFifo.shift()!();
      return true;
    }
    if (this.n > 0) {
      this.n -= 1;
      return true;
    }
    return false;
  }

  public tryReleaseAll(): boolean {
    const ret = this.acquireFifo.length > 0 || this.n > 0;
    const existAcquireFifo = this.acquireFifo;
    this.acquireFifo = [];
    for (let i = 0; i < existAcquireFifo.length; i += 1) {
      existAcquireFifo[i]();
    }
    this.n = 0;
    return ret;
  }
}
