
export function deleteKey(env: Env, key: string) {
  return env.LATENCIES_STORE.delete(key);
}
