import axios, { AxiosInstance } from 'axios';
import pRetry from 'p-retry';

const client: AxiosInstance = axios.create({ timeout: 10000 });

export async function getWithRetry<T>(url: string): Promise<T> {
  return pRetry(async () => {
    const r = await client.get<T>(url);
    return r.data as T;
  }, {
    onFailedAttempt: (err: any) => {
      console.warn(`Request failed for ${url}: ${err?.message}. attempt ${err?.attemptNumber}`);
    },
    retries: 3,
  });
}

export default client;
