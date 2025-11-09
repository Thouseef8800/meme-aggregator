import Aggregator from '../src/aggregator';
import * as httpClient from '../src/httpClient';

jest.mock('../src/httpClient');

describe('aggregator primary symbol selection', () => {
  afterEach(() => jest.resetAllMocks());

  test('marks primary address for symbol by highest volume', async () => {
    // two items with same symbol but different addresses and volumes
    const items = { tokens: [
      { address: '0x1', name: 'A', symbol: 'ZZ', price: 1, volume: 10 },
      { address: '0x2', name: 'A', symbol: 'ZZ', price: 1, volume: 200 }
    ] } as any;

    (httpClient.getWithRetry as jest.Mock).mockResolvedValue(items);

    const agg = new Aggregator();
    const snap = await new Promise(resolve => agg.on('snapshot', resolve));
  // @ts-ignore
  const primary: any = Object.values(snap).find((t: any) => t.is_primary_for_symbol);
  expect(primary).toBeDefined();
  expect(primary.token_address).toBe('0x2');
    agg.stop();
  }, 10000);
});
