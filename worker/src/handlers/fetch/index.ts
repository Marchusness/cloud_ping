import {
  AWSRegion, ChinaAwsRegion, allAwsRegions, awsRegionToName, isValidRegion
} from "../../constants/aws";
import { AvgDocument, PingDocument } from "../../models/documents";
import { CORS_HEADERS } from "../../constants/corsHeaders";
import { RegionToLatency, pingRemainingRegions } from "../../utils/pingRemainingRegions";
import { RequestBody, ResponseBody } from "../../models/requestResponse";
import { SOURCE_CODE_URL } from "../../constants/sourceCodeUrl";
import { shouldPingNewRegion } from "./shouldPingNewRegion";
import { uploadLatenciesToStore } from "./uploadLatencyToStore";

async function corsWrapper(handler: () => Promise<{
  body: string | null;
  status: number;
}>): Promise<Response> {
  const {
    body,
    status,
  } = await handler();

  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export async function fetchHandler(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  return await corsWrapper(async () => {
    if (request.method === "OPTIONS") {
      return {
        body: null,
        status: 204,
      };
    }

    if (request.method !== "POST" && request.method !== "GET") {
      return {
        body: null,
        status: 405,
      };
    }

    let requestBody: RequestBody = {};
    let optimiseForRegions: (AWSRegion | ChinaAwsRegion)[] | undefined = undefined;
    let getResultsForCloudflareDataCenterId: string | undefined = undefined;
    try {
      requestBody = await request.json();
      optimiseForRegions = requestBody?.onNoCache?.optimiseForRegions?.filter(isValidRegion);
      getResultsForCloudflareDataCenterId = requestBody?.resultsForCloudflareDataCenterId;
    } catch (error) {
    // Do nothing
    }

    const cloudflareDataCenterId = request.cf?.colo as string;
    console.log({
      message: "received request",
      cloudflareDataCenterId,
    });

    if (getResultsForCloudflareDataCenterId) {
      const avgLatency = await env.LATENCIES_STORE.get("avg:" + getResultsForCloudflareDataCenterId, {
        type: "json",
      }) as AvgDocument | undefined;

      if (avgLatency) {
        const responseBody: ResponseBody = {
          results: avgLatency.results.map((res) => ({
            region: res.region,
            firstPingLatency: res.firstPingLatency,
            secondPingLatency: res.secondPingLatency,
            name: awsRegionToName[res.region],
          })),
          averageFromPingCount: avgLatency.count,
          cloudflareDataCenterAirportCode: getResultsForCloudflareDataCenterId,
          sourceCode: SOURCE_CODE_URL,
        };

        return {
          body: JSON.stringify(responseBody),
          status: 200,
        };
      } else {
        return {
          body: JSON.stringify({
            errorMessage: "No data found for the provided Cloudflare data center ID",
            providedCloudflareDataCenterId: getResultsForCloudflareDataCenterId,
          }),
          status: 404,
        };
      }
    }

    const avgLatency = await env.LATENCIES_STORE.get("avg:" + cloudflareDataCenterId, {
      type: "json",
    }) as AvgDocument | undefined;

    if (avgLatency) {
      console.log({
        message: "found avg latency",
        cloudflareDataCenterId,
        avgLatencyDocument: avgLatency,
      });

      const responseBody: ResponseBody = {
        results: avgLatency.results.map((res) => ({
          region: res.region,
          firstPingLatency: res.firstPingLatency,
          secondPingLatency: res.secondPingLatency,
          name: awsRegionToName[res.region],
        })),
        averageFromPingCount: avgLatency.count,
        cloudflareDataCenterAirportCode: cloudflareDataCenterId,
        sourceCode: SOURCE_CODE_URL,
      };

      if (shouldPingNewRegion(avgLatency.count)) {
        console.log({
          message: "uploading new latencies",
          avgLatencyCount: avgLatency.count,
        });
        ctx.waitUntil(uploadLatenciesToStore(cloudflareDataCenterId, env));
      }

      console.log({
        message: "returning avg latency",
        responseBody,
      });

      return {
        body: JSON.stringify(responseBody),
        status: 200,
      };
    }

    let responseBody: ResponseBody;

    const latenciesKeys = await env.LATENCIES_STORE.list({
      prefix: "ping:" + cloudflareDataCenterId,
      limit: 1,
    });

    if (latenciesKeys.keys.length === 0) {
      console.log({
        message: "no latencies found, generating new latencies",
        cloudflareDataCenterId,
      });

      const partialResults: RegionToLatency = await pingRemainingRegions(optimiseForRegions ?? allAwsRegions);

      ctx.waitUntil(uploadLatenciesToStore(cloudflareDataCenterId, env, partialResults));

      responseBody = {
        results: Object.entries(partialResults).map(([region, latencyData]) => ({
          region: region as keyof RegionToLatency,
          firstPingLatency: latencyData.firstPingLatency,
          secondPingLatency: latencyData.secondPingLatency,
          name: awsRegionToName[region as keyof RegionToLatency],
        })),
        cloudflareDataCenterAirportCode: cloudflareDataCenterId,
        averageFromPingCount: 1,
        sourceCode: SOURCE_CODE_URL,
      };
    } else {
      console.log({
        message: "found latency data in pings not yet processed",
        cloudflareDataCenterId,
      });

      const res = await env.LATENCIES_STORE.get(latenciesKeys.keys[0].name, {
        type: "json",
      }) as PingDocument;
      responseBody = {
        results: res.results.map((res) => ({
          region: res.region,
          firstPingLatency: res.firstPingLatency,
          secondPingLatency: res.secondPingLatency,
          name: awsRegionToName[res.region],
        })),
        averageFromPingCount: 1,
        cloudflareDataCenterAirportCode: cloudflareDataCenterId,
        sourceCode: SOURCE_CODE_URL,
      };

      ctx.waitUntil(uploadLatenciesToStore(cloudflareDataCenterId, env));
    }
    console.log({
      message: "returning latency data",
      responseBody,
    });

    return {
      body: JSON.stringify(responseBody),
      status: 200,
    };
  });
}
