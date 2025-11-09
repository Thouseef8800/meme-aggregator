import axios, { AxiosInstance } from 'axios';
import metrics from './metrics';
import config from './config';
// Lightweight retry helper to avoid ESM-only dependency in tests

const client: AxiosInstance = axios.create({ timeout: 10000 });

// Simple per-source circuit breaker state to avoid hammering failing providers
const circuitMap: Map<string, { failures: number; trippedUntil: number | null }> = new Map();
const CIRCUIT_FAILURES = Number(config.circuitFailures || 3);
const CIRCUIT_COOLDOWN_MS = Number(config.circuitCooldownMs || 60000);

function parseRetryAfter(header?: string): number | null {
  if (!header) return null;
  const sec = Number(header);
  if (!Number.isNaN(sec)) return sec * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

export async function getWithRetry<T>(
  url: string,
  retries = 4,
  baseDelay = 300,
  opts?: { headers?: Record<string, string>; raw?: boolean; source?: string }
): Promise<T | { status: number; data: T | null; headers: any } | null> {
  let attempt = 0;
  while (true) {
    // Check circuit breaker for source
    if (opts?.source) {
      const st = circuitMap.get(opts.source);
      if (st && st.trippedUntil && st.trippedUntil > Date.now()) {
  try { metrics.increment('provider_circuit_tripped_total', { source: opts?.source || 'unknown' }); } catch {}
        // Return no-data to let callers use cache fallback
        if (opts?.raw) return { status: 0, data: null, headers: {} };
        return null;
      }
    }
    const start = Date.now();
    try {
      const r = await client.get<T>(url, { headers: opts?.headers });
      try { metrics.increment('http_request_total'); } catch {}
  try { metrics.increment('http_requests_total', { source: opts?.source || 'unknown', status: String(r.status) }); } catch {}
      try { metrics.increment('http_200_total'); } catch {}
      const dur = Date.now() - start;
  try { metrics.observe('http_request_duration_seconds', dur / 1000, { source: opts?.source || 'unknown' }); } catch {}
      // on success reset circuit failures for source
      if (opts?.source) {
        circuitMap.set(opts.source, { failures: 0, trippedUntil: null });
      }
      if (opts?.raw) return { status: r.status, data: r.data as T, headers: r.headers };
      return r.data as T;
    } catch (err: any) {
      const dur = Date.now() - start;
      try { metrics.increment('http_request_duration_ms', dur); } catch {}
      attempt++;
      const status = err?.response?.status;

      // If client error (other than 429, 304), don't retry
      if (status && status >= 400 && status < 500 && status !== 429 && status !== 304) {
        throw err;
      }

      // If 304 Not Modified and raw requested, return a 304 wrapper
      if (status === 304) {
        try { metrics.increment('http_304_total'); } catch {}
        if (opts?.raw) return { status: 304, data: null, headers: err?.response?.headers };
        // if not raw, return null to caller
        return null as any;
      }

      // increment some coarse metrics for status classes
      try {
  if (status === 429) metrics.increment('http_429_total', { source: opts?.source || 'unknown' });
        else if (status >= 500) metrics.increment('http_5xx_total');
        else if (status >= 400) metrics.increment('http_4xx_total');
      } catch {}

      if (attempt > retries) {
        // register failure for circuit breaker
        if (opts?.source) {
          const prev = circuitMap.get(opts.source) || { failures: 0, trippedUntil: null };
          const failures = prev.failures + 1;
          let trippedUntil = prev.trippedUntil;
          if (failures >= CIRCUIT_FAILURES) {
            trippedUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
            try { metrics.increment('provider_circuit_tripped_total'); } catch {}
            console.warn(`Circuit breaker tripped for ${opts.source} until ${new Date(trippedUntil).toISOString()}`);
          }
          circuitMap.set(opts.source, { failures, trippedUntil });
        }
        throw err;
      }

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
        try { metrics.increment('http_429_total'); } catch {}
      } else {
        console.warn(`Request failed for ${url}: ${err?.message}. retrying in ${delay}ms (attempt ${attempt}/${retries})`);
      }

      // jitter 0..1000ms
      const jitter = Math.floor(Math.random() * 1000);
      await new Promise((res) => setTimeout(res, delay + jitter));
    }
  }
}

// expose circuit state for diagnostics
export function getCircuitState() {
  const out: Record<string, { failures: number; trippedUntil: number | null }> = {};
  for (const [k, v] of circuitMap.entries()) out[k] = v;
  return out;
}

export default client;
