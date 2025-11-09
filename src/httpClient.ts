import axios, { AxiosInstance } from 'axios';
// Lightweight retry helper to avoid ESM-only dependency in tests

const client: AxiosInstance = axios.create({ timeout: 10000 });

function parseRetryAfter(header?: string): number | null {
  if (!header) return null;
  const sec = Number(header);
  if (!Number.isNaN(sec)) return sec * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

export async function getWithRetry<T>(url: string, retries = 4, baseDelay = 300): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const r = await client.get<T>(url);
      return r.data as T;
    } catch (err: any) {
      attempt++;
      const status = err?.response?.status;

      // If client error (other than 429), don't retry
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err;
      }

      if (attempt > retries) throw err;

      // If rate-limited, use Retry-After header when available, else back off harder
      let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 5000);
      if (status === 429) {
        const ra = parseRetryAfter(err?.response?.headers?.['retry-after']);
        if (ra && ra > 0) {
          delay = ra;
        } else {
          // increase base for 429s to be more conservative
          delay = Math.min(baseDelay * Math.pow(4, attempt - 1), 30000);
        }
        console.warn(`Received 429 for ${url}. backing off for ${delay}ms (attempt ${attempt}/${retries})`);
      } else {
        console.warn(`Request failed for ${url}: ${err?.message}. retrying in ${delay}ms (attempt ${attempt}/${retries})`);
      }

      // jitter 0..1000ms
      const jitter = Math.floor(Math.random() * 1000);
      await new Promise((res) => setTimeout(res, delay + jitter));
    }
  }
}

export default client;
