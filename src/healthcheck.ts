export default async function healthcheck() {
  return { status: 'ok', time: Date.now() };
}
