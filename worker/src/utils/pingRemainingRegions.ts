import { AWSRegion, ChinaAwsRegion } from "../constants/aws";
import { parallelProcessor } from "./parallelProcessor";
import { ping } from "./ping";
import { shuffleArray } from "./shuffleArray";

export type RegionToLatency = Record<AWSRegion | ChinaAwsRegion, {
  firstPingLatency: number;
  secondPingLatency: number;
}>;

export async function pingRemainingRegions(
  regions: (AWSRegion | ChinaAwsRegion)[],
  existingResults: RegionToLatency = {} as RegionToLatency,
) {
  const results = {} as RegionToLatency;

  const shuffledRegions = shuffleArray(regions);

  await parallelProcessor(shuffledRegions, async (region) => {
    if (existingResults[region] !== undefined) {
      results[region] = existingResults[region];
    } else {
      results[region] = await ping(region);
    }
  }, 4);

  return results;
}
