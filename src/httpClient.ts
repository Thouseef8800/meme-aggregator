import axios, { AxiosInstance } from 'axios';
// Lightweight retry helper to avoid ESM-only dependency in tests

const client: AxiosInstance = axios.create({ timeout: 10000 });

export async function getWithRetry<T>(url: string, retries = 3, baseDelay = 300): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const r = await client.get<T>(url);
      return r.data as T;
    } catch (err: any) {
      attempt++;
      const status = err?.response?.status;
      // Do not retry on client errors
      if (status && status >= 400 && status < 500) {
        throw err;
      }
      if (attempt > retries) throw err;
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 5000);
      console.warn(`Request failed for ${url}: ${err?.message}. retrying in ${delay}ms (attempt ${attempt}/${retries})`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

export default client;
