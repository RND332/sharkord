import { describe, expect, it } from 'bun:test';
import { memoizeImport } from './prefetch';

describe('memoizeImport', () => {
  it('shares an in-flight import between prefetch and the first render', async () => {
    let requests = 0;
    const load = memoizeImport(async () => ({ value: ++requests }));

    const [prefetch, render] = await Promise.all([load(), load()]);

    expect(requests).toBe(1);
    expect(render).toBe(prefetch);
  });

  it('allows a failed chunk request to be retried', async () => {
    let requests = 0;
    const load = memoizeImport(async () => {
      requests += 1;
      if (requests === 1) throw new Error('network');
      return { value: 'loaded' };
    });

    await expect(load()).rejects.toThrow('network');
    await expect(load()).resolves.toEqual({ value: 'loaded' });
    expect(requests).toBe(2);
  });
});
