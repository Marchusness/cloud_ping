import { PingDocument } from "../../models/documents";
import { allAwsRegions } from "../../constants/aws";
import { batchInsertLatencyData } from "../../services/d1/batchInsertLatencyData";
import { getCachedStats } from "../../services/kv/getCachedStats";
import { pingRegions } from "../../utils/pingRegions";
import { putPing } from "../../services/kv/putPing";
import { shuffleArray } from "../../utils/shuffleArray";

// Pinging many regions back to back from one invocation skews the later results,
// so once an airport has data for every region only a small random sample is pinged per run
const SAMPLED_REGION_COUNT = 5;
const ALL_REGIONS_CONCURRENCY = 4;

async function hasDataForAllRegions(env: Env, cloudflareDataCenterId: string) {
  const stats = await getCachedStats(env, cloudflareDataCenterId);
  if (!stats) {
    return false;
  }

  const regionsWithData = new Set(stats.results.map((res) => res.region));
  return allAwsRegions.every((region) => regionsWithData.has(region));
}

export async function getAndUploadLatencies(
  cloudflareDataCenterId: string,
  env: Env,
) {
  const pingAllRegions = !await hasDataForAllRegions(env, cloudflareDataCenterId);

  const shuffledRegions = shuffleArray(allAwsRegions);
  const regions = pingAllRegions ? shuffledRegions : shuffledRegions.slice(0, SAMPLED_REGION_COUNT);

  // Sampled regions are pinged one at a time so ping_order reflects a clean sequence
  const results = await pingRegions(regions, pingAllRegions ? ALL_REGIONS_CONCURRENCY : 1);

  const pingDoc: PingDocument = {
    results,
    timestamp: Date.now(),
    cloudflareDataCenterAirportCode: cloudflareDataCenterId,
  };

  console.log({
    message: "uploading ping document",
    pingAllRegions,
    pingDoc,
  });

  await putPing(env, cloudflareDataCenterId, pingDoc);
  await batchInsertLatencyData(env, [pingDoc]);

  return pingDoc;
}
