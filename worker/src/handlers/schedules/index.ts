import { deletePing } from "../../services/kv/deletePings";
import { getRecentlyPingedKeys } from "../../services/kv/getPingKeys";
import { getStatsForAirportCode } from "../../services/d1/getStatsForAirportCode";
import { putStats } from "../../services/kv/putStats";

export async function scheduledHandler(event: ScheduledController, env: Env) {
  const pingKeys = await getRecentlyPingedKeys(env);

  const cloudflareAirportCodes = new Set<string>(pingKeys.map((key) => key.split(":")[1]));

  for (const code of cloudflareAirportCodes) {
    const stats = await getStatsForAirportCode(env, code);
    if (!stats) {
      console.error(`No stats found for airport code: ${code}`);
      continue;
    }
    await putStats(env, code, stats);
  }

  for (const key of pingKeys) {
    await deletePing(env, key);
  }
}
