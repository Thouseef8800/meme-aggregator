import { TokenData } from '../src/types';

function makeTokens(n: number) {
  const out: Record<string, TokenData> = {};
  for (let i = 0; i < n; i++) {
    out[`addr${i}`] = { token_address: `addr${i}`, token_name: `t${i}`, token_ticker: `T${i}`, volume_sol: i, last_updated: Date.now() };
  }
  return Object.values(out);
}

describe('pagination logic', () => {
  test('cursor encoding/decoding', () => {
    const start = 10;
    const cursor = Buffer.from(String(start)).toString('base64');
    const decoded = Number(Buffer.from(cursor, 'base64').toString('utf-8'));
    expect(decoded).toBe(start);
  });

  test('slicing tokens', () => {
    const arr = makeTokens(50);
    const start = 5;
    const limit = 10;
    const page = arr.slice(start, start + limit);
    expect(page.length).toBe(10);
    expect(page[0].token_address).toBe('addr5');
  });
});
