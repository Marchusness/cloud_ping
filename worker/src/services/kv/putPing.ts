import { PING } from "./prefixes";
import { PingDocument } from "../../models/documents";

export async function putPing(
  env: Env,
  airportCode: string,
  pingDoc: PingDocument,
): Promise<void> {
  const randomString = crypto.randomUUID().replaceAll("-", "");

  await env.LATENCIES_STORE.put(
    PING + airportCode + ":" + randomString,
    JSON.stringify(pingDoc),
  );

  console.log(`Put ping document for ${airportCode} with random string ${randomString}`);
}
