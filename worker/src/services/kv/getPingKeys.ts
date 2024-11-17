import { PING } from "./prefixes";

export async function getRecentlyPingedKeys(env: Env) {
  const pingKeys = await env.LATENCIES_STORE.list({
    prefix: PING,
    limit: 800,
  });

  return pingKeys.keys.map((key) => key.name);
}
