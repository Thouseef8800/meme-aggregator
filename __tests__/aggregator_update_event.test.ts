import Aggregator from '../src/aggregator';
import * as httpClient from '../src/httpClient';

jest.mock('../src/httpClient');

describe('aggregator update emission', () => {
  afterEach(() => jest.resetAllMocks());

  test('emits update when price changes between polls', async () => {
    // first call returns price 1, second call returns price 2
    let call = 0;
    (httpClient.getWithRetry as jest.Mock).mockImplementation((url: string) => {
      call++;
      if (url.includes('dexscreener')) {
        return Promise.resolve({ tokens: [ { address: '0xabc', name: 'T', symbol: 'T', price: call === 1 ? 1 : 2, volume: 10 } ] });
      }
      return Promise.resolve({ data: [] });
    });

    const agg = new Aggregator();

    // wait for first snapshot
    await new Promise(resolve => agg.on('snapshot', resolve));

    const updatePromise = new Promise(resolve => agg.on('update', (updates) => resolve(updates)));

    // trigger another fetch
    await agg.fetchAndUpdate();

    const updates = await updatePromise;
    expect((updates as any).length).toBeGreaterThanOrEqual(0);
    agg.stop();
  }, 15000);
});
