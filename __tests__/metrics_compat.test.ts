import metrics from '../src/metrics';

describe('metrics compatibility', () => {
  beforeEach(() => {
    try { metrics.resetAll(); } catch {};
  });

  test('increment and getAll produce synchronous map', async () => {
    await metrics.increment('test_counter');
    await metrics.increment('test_counter', 2);
    const all = metrics.getAll();
    expect(all).toHaveProperty('test_counter');
    expect(all['test_counter']).toBeGreaterThanOrEqual(3);
  });

  test('renderPrometheus returns prometheus text', async () => {
    await metrics.increment('prom_counter');
    const text = await metrics.renderPrometheus();
    expect(typeof text).toBe('string');
    expect(text).toMatch(/prom_counter/);
  });
});
