import { PingDocument } from "../../models/documents";
import { RegionToLatency, pingRemainingRegions } from "../../utils/pingRemainingRegions";
import { allAwsRegions } from "../../constants/aws";
import { batchInsertLatencyData } from "../../services/d1/batchInsertLatencyData";
import { putPing } from "../../services/kv/putPing";

export async function getAndUploadLatencies(
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

  const pingDoc: PingDocument = {
    results,
    timestamp: Date.now(),
    cloudflareDataCenterAirportCode: cloudflareDataCenterId,
  };

  console.log({
    message: "uploading ping document",
    pingDoc,
  });

  await putPing(env, cloudflareDataCenterId, pingDoc);
  await batchInsertLatencyData(env, [pingDoc]);

  return pingDoc;
}
