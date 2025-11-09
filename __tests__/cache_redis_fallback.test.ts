// Test Redis runtime errors fallback to in-memory cache
describe('cache redis fallback', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.REDIS_URL;
  });

  test('falls back to memory when redis.set/get throw', async () => {
    // Mock ioredis to succeed on ping but throw on get/set
    const RedisMock = jest.fn().mockImplementation(() => ({
      ping: async () => {},
      set: async () => { throw new Error('redis set fail'); },
      get: async () => { throw new Error('redis get fail'); },
      del: async () => {},
      disconnect: () => {},
    }));
    jest.mock('ioredis', () => RedisMock);

    const { initCache, setCache, getCache } = await import('../src/cache');
    const metrics = await import('../src/metrics');

    await initCache();

    await setCache('rb:test', { x: 1 }, 1);
    const v = await getCache('rb:test');
    expect(v).toEqual({ x: 1 });

  const all = (metrics as any).default.getAll();
  expect(all['cache_error_total']).toBeGreaterThanOrEqual(1);
  }, 20000);
});
