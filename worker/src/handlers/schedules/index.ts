import { deleteKey } from "../../services/kv/deleteKey";
import { getRecentlyPingedKeys } from "../../services/kv/getPingKeys";
import { getStatsForAirportCode } from "../../services/d1/getStatsForAirportCode";
import { putStats } from "../../services/kv/putStats";

export async function scheduledHandler(event: ScheduledController, env: Env) {
  const uuid = crypto.randomUUID();
  const pingKeys = await getRecentlyPingedKeys(env);

  console.log(`${uuid} Found ${pingKeys.length} ping keys to process`);

  const cloudflareAirportCodes = new Set<string>(pingKeys.map((key) => key.split(":")[1]));

  console.log(`${uuid} Found ${cloudflareAirportCodes.size} unique airport codes`);

  for (const code of cloudflareAirportCodes) {
    const stats = await getStatsForAirportCode(env, code);
    if (!stats) {
      console.error(`${uuid} No stats found for airport code: ${code}`);
      continue;
    }
    console.log(`${uuid} Found stats for airport code: ${code}`);
    await putStats(env, code, stats);
  }

  for (const key of pingKeys) {
    await deleteKey(env, key);
  }

  console.log(`${uuid} Finished deleting keys`);
}
