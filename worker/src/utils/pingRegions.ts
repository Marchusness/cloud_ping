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

export async function pingRegions(
  regions: (AWSRegion | ChinaAwsRegion)[],
  concurrency: number,
): Promise<RegionLatency[]> {
  return await parallelProcessor(regions, async (region, index) => ({
    region,
    ...await ping(region),
    pingOrder: index + 1,
  }), concurrency);
}
