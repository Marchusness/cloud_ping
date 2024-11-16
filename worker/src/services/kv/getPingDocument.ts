import { PingDocument } from "../../models/documents";

export async function getPingDocument(env: Env, key: string) {
  return await env.LATENCIES_STORE.get(key, {
    type: "json",
  }) as PingDocument;
}
