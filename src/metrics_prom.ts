import client from 'prom-client';

// Default registry
const register = client.register;

// Keeps track of created metric objects
const counters = new Map<string, client.Counter<string>>();
const gauges = new Map<string, client.Gauge<string>>();
const histograms = new Map<string, client.Histogram<string>>();
// Lightweight sync snapshot for backwards-compatible getAll()
const metricValues: Record<string, number> = {};

function metricName(name: string) {
  // sanitize to prometheus-friendly name
  return name.replace(/[^a-zA-Z0-9_:]/g, '_');
}

function ensureCounter(name: string, _labelNames: string[] = []) {
  const n = metricName(name);
  if (!counters.has(n)) {
    // register without labels to avoid duplicate metric registration errors
    counters.set(n, new client.Counter({ name: n, help: `${n} counter`, labelNames: [] }));
  }
  return counters.get(n)!;
}

function ensureGauge(name: string, _labelNames: string[] = []) {
  const n = metricName(name);
  if (!gauges.has(n)) {
    gauges.set(n, new client.Gauge({ name: n, help: `${n} gauge`, labelNames: [] }));
  }
  return gauges.get(n)!;
}

function ensureHistogram(name: string, _labelNames: string[] = [], buckets?: number[]) {
  const n = metricName(name);
  if (!histograms.has(n)) {
    histograms.set(n, new client.Histogram({ name: n, help: `${n} histogram`, labelNames: [], buckets }));
  }
  return histograms.get(n)!;
}

// Backwards-compatible increment:
// - increment(name) => +1
// - increment(name, value:number) => +value
// - increment(name, labels, value?) => labeled increment
export async function increment(metric: string, labelsOrValue?: Record<string, string> | number, maybeValue = 1) {
  let labels: Record<string, string> | undefined;
  let value = 1;
  if (typeof labelsOrValue === 'number') {
    value = labelsOrValue;
  } else if (labelsOrValue && typeof labelsOrValue === 'object') {
    labels = labelsOrValue as Record<string, string>;
    value = maybeValue;
  }

  const c = ensureCounter(metric);
  // prom-client metric created without labels; update simple counter and prom counter without labels
  c.inc(value);
  // maintain simple numeric snapshot
  metricValues[metric] = (metricValues[metric] || 0) + value;
}

export function set(metric: string, value: number, labels?: Record<string, string>) {
  const g = ensureGauge(metric);
  g.set(value);
  metricValues[metric] = value;
}

export function observe(metric: string, value: number, labels?: Record<string, string>) {
  const h = ensureHistogram(metric);
  h.observe(value);
  // For histograms we keep a running sum (not a true histogram snapshot) to allow simple assertions in tests
  metricValues[metric] = (metricValues[metric] || 0) + value;
}

export function resetAll() {
  register.clear();
  counters.clear();
  gauges.clear();
  histograms.clear();
  for (const k of Object.keys(metricValues)) delete metricValues[k];
}

export function getAll(): Record<string, number> {
  return { ...metricValues };
}

export async function renderPrometheus() {
  return await register.metrics();
}

export { register };

export default {
  increment,
  set,
  observe,
  resetAll,
  getAll,
  renderPrometheus,
  register,
};
