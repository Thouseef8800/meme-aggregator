// Mock axios.create to return a client object whose `get` we can control
const getMock = jest.fn();
jest.mock('axios', () => ({ create: () => ({ get: getMock }) }));

import { getWithRetry } from '../src/httpClient';

describe('httpClient retry helper', () => {
  afterEach(() => jest.resetAllMocks());

  test('retries on transient error and succeeds', async () => {
    let call = 0;
    getMock.mockImplementation(async (url: string) => {
      call++;
      if (call < 2) {
        const err: any = new Error('timeout');
        err.code = 'ETIMEDOUT';
        throw err;
      }
      return { data: { ok: true } } as any;
    });

    const res = await getWithRetry('/foo', 3, 10);
    expect(res).toEqual({ ok: true });
    expect(call).toBeGreaterThanOrEqual(2);
  });

  test('does not retry on 4xx and throws immediately', async () => {
    getMock.mockImplementation(async () => {
      const err: any = new Error('not found');
      err.response = { status: 404 };
      throw err;
    });

    await expect(getWithRetry('/not-found', 2, 5)).rejects.toThrow();
  });
});
