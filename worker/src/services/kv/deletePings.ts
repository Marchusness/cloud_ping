
export function deletePing(env: Env, key: string) {
  return env.LATENCIES_STORE.delete(key);
}
