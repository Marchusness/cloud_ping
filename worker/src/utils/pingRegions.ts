import { AWSRegion, ChinaAwsRegion } from "../constants/aws";
import { parallelProcessor } from "./parallelProcessor";
import { ping } from "./ping";

export type RegionLatency = {
  region: AWSRegion | ChinaAwsRegion;
  firstPingLatency: number;
  secondPingLatency: number;
  // 1-based position in which this region was pinged during the run
  pingOrder: number;
};

// Regions that fail or time out are logged and left out of the results
export async function pingRegions(
  regions: (AWSRegion | ChinaAwsRegion)[],
  concurrency: number,
): Promise<RegionLatency[]> {
  const results = await parallelProcessor(regions, async (region, index) => {
    try {
      return {
        region,
        ...await ping(region),
        pingOrder: index + 1,
      };
    } catch (error) {
      console.error(`Failed to ping ${region}:`, error);
      return null;
    }
  }, concurrency);

  return results.filter((result) => result !== null);
}
