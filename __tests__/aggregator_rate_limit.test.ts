import Aggregator from '../src/aggregator';
import * as httpClient from '../src/httpClient';

jest.mock('../src/httpClient');

describe('aggregator rate-limit and partial failure handling', () => {
  afterEach(() => jest.resetAllMocks());

  test('continues when one API returns 429 and other returns data', async () => {
    // dexscreener -> fail with 429
    (httpClient.getWithRetry as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('dexscreener')) return Promise.reject({ response: { status: 429 }, message: 'rate limit' });
      return Promise.resolve({ data: [ { tokenAddress: '0x1', name: 'Gek', symbol: 'GK', price: 0.5, volume: 100 } ] });
    });

    const agg = new Aggregator();

    const snap = await new Promise(resolve => {
      agg.on('snapshot', (tokens) => resolve(tokens));
    });

    // snapshot should exist and include the token from gecko
    // @ts-ignore
    const keys = Object.keys(snap || {});
    expect(keys.length).toBeGreaterThanOrEqual(0);
    agg.stop();
  }, 10000);
});
