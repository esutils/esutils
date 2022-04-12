import { Deferred } from '@esutils/deferred';

describe('Deferred in typescript', () => {
  it('constructor', () => {
    expect(typeof Deferred).toBe('function');
  });

  it('constructor instance', () => {
    expect(new Deferred()).toBeInstanceOf(Deferred);
  });

  describe('.resolve', () => {
    it('should be a function', () => {
      const deferred = new Deferred();
      expect(typeof deferred.resolve).toBe('function');
    });

    it('should returns void', () => {
      const deferred = new Deferred<void>();
      expect(deferred.resolve()).toBe(undefined);
    });

    it('should resolve the promise using given value', async () => {
      const deferred = new Deferred<string>();
      deferred.resolve('Chai Maxx');
      expect(await deferred.promise).toBe('Chai Maxx');
    });

    it('should be bound to the Deferred instance', async () => {
      const deferred = new Deferred<string>();
      const { resolve } = deferred;
      resolve('Chai Maxx ZERO');
      expect(await deferred.promise).toBe('Chai Maxx ZERO');
    });

    it('should be mock function when using jest.spyOn', () => {
      const deferred = new Deferred<string>();
      const mock = jest.spyOn(deferred, 'resolve');
      deferred.resolve('DECORATION');
      expect(mock).toBeCalledWith('DECORATION');
    });
  });

  describe('.reject', () => {
    it('should be a function', () => {
      const deferred = new Deferred<string>();
      expect(typeof deferred.reject).toBe('function');
    });

    it('should returns void', () => {
      const deferred = new Deferred<string>();
      deferred.promise.catch(() => {});
      expect(deferred.reject()).toBe(undefined);
    });

    it('should reject the promise with the reason', async () => {
      const deferred = new Deferred<string>();
      let reason!: string;
      try {
        deferred.reject('CONTRADICTION');
        await deferred.promise;
      } catch (thrown) {
        reason = thrown as string;
      }
      expect(reason).toBe('CONTRADICTION');
    });

    it('should be bound to the Deferred instance', async () => {
      const deferred = new Deferred<string>();
      let reason: any;
      try {
        const { reject } = deferred;
        reject('Yum-Yum!');
        await deferred.promise;
      } catch (thrown) {
        reason = thrown;
      }
      expect(reason).toBe('Yum-Yum!');
    });

    it('should be mock function when using jest.spyOn', () => {
      const deferred = new Deferred<string>();
      const mock = jest.spyOn(deferred, 'reject');
      deferred.promise.catch(() => {});
      deferred.reject('GODSPEED');
      expect(mock).toBeCalledWith('GODSPEED');
    });
  });

  describe('.promise', () => {
    it('should be an instance of Promise', () => {
      const deferred = new Deferred<string>();
      expect(deferred.promise).toBeInstanceOf(Promise);
    });

    it('should be resolved with a value when `.resolve()` is called with the value', async () => {
      const deferred = new Deferred<string>();
      deferred.resolve('Momoiro Clover Z');
      await deferred.promise.then((value: string) => {
        expect(value).toBe('Momoiro Clover Z');
      });
    });

    it('should be rejected with a reason when `.reject()` is called with the reason', async () => {
      const deferred = new Deferred<string>();
      deferred.reject('Some Error');
      await deferred.promise.catch((reason: string) => {
        expect(reason).toBe('Some Error');
      });
    });

    it('should be rejected with a `undefined` reason when `.reject()` is called without arguments', async () => {
      const deferred = new Deferred<string>();
      deferred.reject();
      await deferred.promise.catch((...args: any[]) => {
        expect(args.length).toEqual(1);
        expect(args[0]).toEqual(undefined);
      });
    });
  });
});
