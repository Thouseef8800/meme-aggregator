import fs from 'fs';
import path from 'path';

describe('postman collection', () => {
  test('collection is valid JSON and contains baseUrl variable', () => {
    const p = path.join(__dirname, '..', 'postman', 'meme-aggregator.postman_collection.json');
    const raw = fs.readFileSync(p, 'utf8');
    const obj = JSON.parse(raw);
    expect(obj).toHaveProperty('info');
    expect(Array.isArray(obj.item)).toBeTruthy();
    const vars = obj.variable || [];
    const hasBase = vars.some((v: any) => v.key === 'baseUrl');
    expect(hasBase).toBeTruthy();
  });
});
