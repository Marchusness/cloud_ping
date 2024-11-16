import { STATS } from "./prefixes";
import { StatsDocument } from "../../models/documents";

export async function getCachedStats(
  env: Env,
  airportCode: string,
) {
  return await env.LATENCIES_STORE.get(STATS + airportCode, {
    type: "json",
  }) as StatsDocument | undefined;
}
