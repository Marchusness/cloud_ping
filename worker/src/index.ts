import {
  AWSRegion, ChinaAwsRegion, allAwsRegions, awsRegionToName,
  isValidRegion
} from "./constants/aws";
import { AvgDocument, PingDocument } from "./models/documents";
import { RegionToLatency, pingRemainingRegions } from "./utils/pingRemainingRegions";
import { RequestBody, ResponseBody } from "./models/requestResponse";

const SOURCE_CODE_URL = "https://github.com/Marchusness/cloud_ping";

function probabilityOfNewPing(count: number) {
  // 1.5 ^ -(x/100)
  return Math.pow(1.5, -(count / 100));
}

async function uploadLatenciesToStore(
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

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const pingKeys = await env.LATENCIES_STORE.list({
      prefix: "ping:",
      limit: 400,
    });

    // get unique set of cloudflare airport codes
    const cloudflareAirportCodes = new Set<string>();
    for (const key of pingKeys.keys) {
      cloudflareAirportCodes.add(key.name.split(":")[1]);
    }

    // get avg latencies for each cloudflare airport code
    const avgLatencies: Record<string, AvgDocument> = {};
    for (const code of cloudflareAirportCodes) {
      const avg = await env.LATENCIES_STORE.get("avg:" + code, {
        type: "json",
      }) as AvgDocument | undefined;

      if (avg) {
        avgLatencies[code] = avg;
      } else {
        avgLatencies[code] = {
          results: [],
          count: 0,
          cloudflareDataCenterAirportCode: code,
        };
      }
    }

    // merge new ping results with avg latencies
    for (const key of pingKeys.keys) {
      const ping = await env.LATENCIES_STORE.get(key.name, {
        type: "json",
      }) as PingDocument;
      await env.LATENCIES_STORE.put(key.name.replace("ping:", "recorded:"), JSON.stringify(ping));

      const avg = avgLatencies[ping.cloudflareDataCenterAirportCode];

      const newResults = ping
        .results
        .map((res) => {
          const existingResult = avg.results.find((r) => r.region === res.region);

          if (!existingResult) {
            return res;
          }

          return {
            region: res.region,
            firstPingLatency: (existingResult.firstPingLatency * avg.count + res.firstPingLatency) / (avg.count + 1),
            secondPingLatency: (existingResult.secondPingLatency * avg.count + res.secondPingLatency) / (avg.count + 1),
          };
        })
        .sort((a, b) => {
          return a.secondPingLatency - b.secondPingLatency;
        });

      avg.results = newResults;
      avg.count += 1;
    }

    // save avg latencies back to store
    for (const code of cloudflareAirportCodes) {
      await env.LATENCIES_STORE.put("avg:" + code, JSON.stringify(avgLatencies[code]));
    }

    // delete ping results
    for (const key of pingKeys.keys) {
      await env.LATENCIES_STORE.delete(key.name);
    }
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST" && request.method !== "GET") {
      return new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
        ...corsHeaders,
      });
    }

    let requestBody: RequestBody = {};
    let optimiseForRegions: (AWSRegion | ChinaAwsRegion)[] | undefined = undefined;
    try {
      requestBody = await request.json();
      optimiseForRegions = requestBody.onNoCache?.optimiseForRegions?.filter(isValidRegion);
    } catch (error) {
      // Do nothing
    }

    const cloudflareDataCenterId = request.cf?.colo as string;

    const avgLatency = await env.LATENCIES_STORE.get("avg:" + cloudflareDataCenterId, {
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
        cloudflareDataCenterAirportCode: cloudflareDataCenterId,
        sourceCode: SOURCE_CODE_URL,
      };

      if (probabilityOfNewPing(avgLatency.count) > Math.random()) {
        ctx.waitUntil(uploadLatenciesToStore(cloudflareDataCenterId, env));
      }

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          "content-type": "application/json",
          ...corsHeaders,
        },
      });
    }

    let responseBody: ResponseBody;

    const latenciesKeys = await env.LATENCIES_STORE.list({
      prefix: "ping:" + cloudflareDataCenterId,
      limit: 1,
    });

    if (latenciesKeys.keys.length === 0) {
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

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        "content-type": "application/json",
        ...corsHeaders,
      },
    });
  },
};
