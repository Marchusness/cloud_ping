import { AWSRegion, ChinaAwsRegion } from "../constants/aws";
import { ping } from "./ping";

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunkedArray = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunkedArray.push(array.slice(i, i + chunkSize));
  }

  return chunkedArray;
}

export type RegionToLatency = Record<AWSRegion | ChinaAwsRegion, {
  firstPingLatency: number;
  secondPingLatency: number;
}>;

export async function pingRemainingRegions(
  regions: (AWSRegion | ChinaAwsRegion)[],
  existingResults: RegionToLatency = {} as RegionToLatency,
) {
  const results = {} as RegionToLatency;

  for (const regionChunk of chunkArray(regions, 3)) {
    await Promise.all(regionChunk.map(async (region) => {
      if (existingResults[region] !== undefined) {
        results[region] = existingResults[region];
      } else {
        results[region] = await ping(region);
      }
    }));
  }

  return results;
}
