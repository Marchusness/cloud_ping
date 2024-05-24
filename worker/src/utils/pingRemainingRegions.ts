import { AWSRegion, ChinaAwsRegion } from "../constants/aws";
import { ping } from "./ping";

export type RegionToLatency = Record<AWSRegion | ChinaAwsRegion, {
  firstPingLatency: number;
  secondPingLatency: number;
}>;

export async function pingRemainingRegions(
  regions: (AWSRegion | ChinaAwsRegion)[],
  existingResults: RegionToLatency = {} as RegionToLatency,
) {
  const results = {} as RegionToLatency;

  for (const region of regions) {
    if (existingResults[region] !== undefined) {
      results[region] = existingResults[region];
    } else {
      results[region] = await ping(region);
    }
  }

  return results;
}
