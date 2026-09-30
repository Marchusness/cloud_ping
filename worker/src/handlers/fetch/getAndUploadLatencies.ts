import { PingDocument } from "../../models/documents";
import { allAwsRegions } from "../../constants/aws";
import { batchInsertLatencyData } from "../../services/d1/batchInsertLatencyData";
import { hasLatencyData } from "../../services/d1/hasLatencyData";
import { pingRegions } from "../../utils/pingRegions";
import { putPing } from "../../services/kv/putPing";
import { shuffleArray } from "../../utils/shuffleArray";

// Pinging many regions back to back from one invocation skews the later results,
// so once an airport has data for every region only a small random sample is pinged per run
const SAMPLED_REGION_COUNT = 5;
const ALL_REGIONS_CONCURRENCY = 4;

export async function getAndUploadLatencies(
  cloudflareDataCenterId: string,
  env: Env,
) {
  // D1 is checked rather than the cached stats so a purged airport gets every region again.
  // Regions that failed in the first run are filled in by later sampled runs, so a region that
  // is unreachable from this data center doesn't force every run to ping all regions
  const pingAllRegions = !await hasLatencyData(env, cloudflareDataCenterId);

  const shuffledRegions = shuffleArray(allAwsRegions);
  const regions = pingAllRegions ? shuffledRegions : shuffledRegions.slice(0, SAMPLED_REGION_COUNT);

  // Sampled regions are pinged one at a time so ping_order reflects a clean sequence
  const results = await pingRegions(regions, pingAllRegions ? ALL_REGIONS_CONCURRENCY : 1);

  if (results.length === 0) {
    throw new Error(`All pings failed for ${cloudflareDataCenterId}`);
  }

  const pingDoc: PingDocument = {
    results,
    timestamp: Date.now(),
    cloudflareDataCenterAirportCode: cloudflareDataCenterId,
    regionsInRun: regions.length,
  };

  console.log({
    message: "uploading ping document",
    pingAllRegions,
    pingDoc,
  });

  // Insert into D1 first so a failed insert doesn't leave a ping key for the cron with no rows behind it
  await batchInsertLatencyData(env, [pingDoc]);
  await putPing(env, cloudflareDataCenterId, pingDoc);

  return pingDoc;
}
