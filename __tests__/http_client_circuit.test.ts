// Test circuit-breaker short-circuiting in httpClient.getWithRetry
jest.resetModules();

const getMock = jest.fn();
jest.mock('axios', () => ({ create: () => ({ get: getMock }) }));

import { getWithRetry } from '../src/httpClient';
import metrics from '../src/metrics';

describe('httpClient circuit breaker', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  test('trips circuit after repeated failures and short-circuits subsequent calls', async () => {
    // make axios.get always throw 500
    getMock.mockImplementation(async () => {
      const err: any = new Error('server error');
      err.response = { status: 500, headers: {} };
      throw err;
    });

    // perform CIRCUIT_FAILURES failed calls; the implementation's constant is 3
    for (let i = 0; i < 3; i++) {
      await expect(getWithRetry('/foo', 0, 1, { source: 'tests' })).rejects.toThrow();
    }

    // next call should be short-circuited (return null) because circuit is tripped
    const res = await getWithRetry('/foo', 0, 1, { source: 'tests' });
    expect(res).toBeNull();

    // metrics should have a provider_circuit_tripped_total increment
    const all = metrics.getAll();
    expect(all['provider_circuit_tripped_total']).toBeGreaterThanOrEqual(1);
  }, 20000);
});
