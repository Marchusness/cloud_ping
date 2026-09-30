import { PingDocument } from "../../models/documents";
import { allAwsRegions } from "../../constants/aws";
import { batchInsertLatencyData } from "../../services/d1/batchInsertLatencyData";
import { getCachedStats } from "../../services/kv/getCachedStats";
import { pingRegions } from "../../utils/pingRegions";
import { putPing } from "../../services/kv/putPing";
import { selectRegionsToPing } from "../../utils/selectRegionsToPing";

// Pinging many regions back to back from one invocation skews the later results,
// so each run only pings a few regions, one at a time
const REGIONS_PER_RUN = 5;

export async function getAndUploadLatencies(
  cloudflareDataCenterId: string,
  env: Env,
) {
  const stats = await getCachedStats(env, cloudflareDataCenterId);
  const regionsWithData = new Set(stats?.results.map((res) => res.region));

  const regions = selectRegionsToPing(allAwsRegions, regionsWithData, REGIONS_PER_RUN);
  const results = await pingRegions(regions);

  if (results.length === 0) {
    throw new Error(`All pings failed for ${cloudflareDataCenterId}`);
  }

  const pingDoc: PingDocument = {
    results,
    timestamp: Date.now(),
    cloudflareDataCenterAirportCode: cloudflareDataCenterId,
  };

  console.log({
    message: "uploading ping document",
    pingDoc,
  });

  // Insert into D1 first so a failed insert doesn't leave a ping key for the cron with no rows behind it
  await batchInsertLatencyData(env, [pingDoc]);
  await putPing(env, cloudflareDataCenterId, pingDoc);

  return pingDoc;
}
