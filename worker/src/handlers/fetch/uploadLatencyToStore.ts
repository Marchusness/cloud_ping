import { PingDocument } from "../../models/documents";
import { RegionToLatency } from "../../utils/pingRemainingRegions";
import { allAwsRegions } from "../../constants/aws";

export async function uploadLatenciesToStore(
  cloudflareDataCenterId: string,
  env: Env,
  existingResults: RegionToLatency = {} as RegionToLatency,
) {
  const results: PingDocument["results"] = [];

  const regionToLatencyData = await pingRemainingRegions(allAwsRegions, existingResults);

  for (const region of allAwsRegions) {
    const {
      firstPingLatency,
      secondPingLatency,
    } = regionToLatencyData[region];

    results.push({
      region,
      firstPingLatency,
      secondPingLatency,
    });
  }

  const randomString = crypto.randomUUID().replaceAll("-", "");

  const store: PingDocument = {
    results,
    timestamp: Date.now(),
    cloudflareDataCenterAirportCode: cloudflareDataCenterId,
  };

  await env.LATENCIES_STORE.put("ping:" + cloudflareDataCenterId + ":" + randomString, JSON.stringify(store));

  return store;
}
