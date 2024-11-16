import { PingDocument } from "../../models/documents";

export async function putPing(
  env: Env,
  airportCode: string,
  pingDoc: PingDocument,
): Promise<void> {
  const randomString = crypto.randomUUID().replaceAll("-", "");

  await env.LATENCIES_STORE.put(
    "ping:" + airportCode + ":" + randomString,
    JSON.stringify(pingDoc),
  );
}
