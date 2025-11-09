import Aggregator from '../src/aggregator';
import * as httpClient from '../src/httpClient';
import { TokenMap } from '../src/types';

jest.mock('../src/httpClient');

describe('Aggregator', () => {
  afterEach(() => jest.resetAllMocks());

  test('merges tokens from multiple sources and emits updates', async () => {
    const sampleA = { tokens: [ { address: '0xabc', name: 'TokA', symbol: 'TA', price: 1, volume: 10 } ] } as any;
    const sampleB = { data: [ { tokenAddress: '0xabc', name: 'TokA', symbol: 'TA', price: 1.1, volume: 12 } ] } as any;

    (httpClient.getWithRetry as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('dexscreener')) return Promise.resolve(sampleA);
      return Promise.resolve(sampleB);
    });

    const agg = new Aggregator();

    // listen for first snapshot and update
    const snapshotPromise = new Promise<TokenMap>((resolve) => {
      agg.on('snapshot', (tokens) => resolve(tokens));
    });

    const tokens = await snapshotPromise;
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(1);
    const t = tokens['0xabc'];
    expect(t.token_name).toBeDefined();
  }, 10000);
});
