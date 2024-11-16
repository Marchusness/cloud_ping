import { PING } from "./prefixes";
import { PingDocument } from "../../models/documents";

export async function getSinglePing(
  env: Env,
  airportCode: string,
): Promise<PingDocument | undefined> {
  const latenciesKeys = await env.LATENCIES_STORE.list({
    prefix: PING + airportCode,
    limit: 1,
  });

  if (latenciesKeys.keys.length === 0) {
    return undefined;
  }

  return await env.LATENCIES_STORE.get(latenciesKeys.keys[0].name, {
    type: "json",
  }) as PingDocument | undefined;
}
