import { AWSRegion, ChinaAwsRegion } from "../constants/aws";
import { ping } from "./ping";

export type RegionLatency = {
  region: AWSRegion | ChinaAwsRegion;
  firstPingLatency: number;
  secondPingLatency: number;
  // 1-based position in which this region was pinged during the run
  pingOrder: number;
};

// Regions are pinged one at a time so pings don't compete with each other and pingOrder is a clean
// sequence. Regions that fail or time out are logged and left out of the results
export async function pingRegions(regions: (AWSRegion | ChinaAwsRegion)[]): Promise<RegionLatency[]> {
  const results: RegionLatency[] = [];

  for (const [index, region] of regions.entries()) {
    try {
      results.push({
        region,
        ...await ping(region),
        pingOrder: index + 1,
      });
    } catch (error) {
      console.error(`Failed to ping ${region}:`, error);
    }
  }

  return results;
}
