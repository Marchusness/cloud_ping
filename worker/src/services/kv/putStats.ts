import { STATS } from "./prefixes";
import { StatsDocument } from "../../models/documents";

export function putStats(
  env: Env,
  airportCode: string,
  analyticsDoc: StatsDocument,
): Promise<void> {
  return env.LATENCIES_STORE.put(
    STATS + airportCode,
    JSON.stringify(analyticsDoc),
  );
}
