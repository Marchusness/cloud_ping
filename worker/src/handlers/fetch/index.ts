import { ResponseBody } from "../../models/requestResponse";
import { SOURCE_CODE_URL } from "../../constants/sourceCodeUrl";
import { awsRegionToName } from "../../constants/aws";
import { corsWrapper } from "../../utils/corsWrapper";
import { extractRequestData } from "./extractRequestDataFromQuery";
import { getAndUploadLatencies } from "./getAndUploadLatencies";
import { getCachedStats } from "../../services/kv/getCachedStats";
import { getSinglePing } from "../../services/kv/getSinglePing";
import { shouldPingNewRegion } from "./shouldPingNewRegion";

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
        body: "invalid method",
        status: 405,
      };
    }

    const cloudflareDataCenterId = request.cf?.colo as string;

    const {
      resultsForCloudflareDataCenterId,
    } = extractRequestData(request);

    if (resultsForCloudflareDataCenterId) {
      if (shouldPingNewRegion()) {
        ctx.waitUntil(getAndUploadLatencies(cloudflareDataCenterId, env));
      }

      const analytics = await getCachedStats(env, resultsForCloudflareDataCenterId);
      if (!analytics) {
        return {
          body: JSON.stringify({
            errorMessage: "No data found for the provided Cloudflare data center ID",
            providedCloudflareDataCenterId: resultsForCloudflareDataCenterId,
          }),
          status: 404,
          headers: {
            "Cache-Control": "public, max-age=3600",
          },
        };
      }

      const responseBody: ResponseBody = {
        results: analytics.results.map((res) => ({
          regionName: awsRegionToName[res.region],
          ...res,
        })).sort((a, b) => a.secondPingLatency.avg - b.secondPingLatency.avg),
        pingCount: analytics.count,
        cloudflareDataCenterAirportCode: resultsForCloudflareDataCenterId,
        sourceCode: SOURCE_CODE_URL,
      };

      return {
        body: JSON.stringify(responseBody),
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      };
    }

    const latencyAnalytics = await getCachedStats(env, cloudflareDataCenterId);

    if (latencyAnalytics) {
      const responseBody: ResponseBody = {
        results: latencyAnalytics.results.map((res) => ({
          regionName: awsRegionToName[res.region],
          ...res,
        })).sort((a, b) => a.secondPingLatency.avg - b.secondPingLatency.avg),
        pingCount: latencyAnalytics.count,
        cloudflareDataCenterAirportCode: cloudflareDataCenterId,
        sourceCode: SOURCE_CODE_URL,
      };

      if (shouldPingNewRegion(latencyAnalytics.count)) {
        ctx.waitUntil(getAndUploadLatencies(cloudflareDataCenterId, env));
      }

      return {
        body: JSON.stringify(responseBody),
        status: 200,
      };
    }

    let pingDoc = await getSinglePing(env, cloudflareDataCenterId);

    if (!pingDoc) {
      console.log({
        message: "no latencies found, generating new latencies",
        cloudflareDataCenterId,
      });

      pingDoc = await getAndUploadLatencies(cloudflareDataCenterId, env);
    } else {
      ctx.waitUntil(getAndUploadLatencies(cloudflareDataCenterId, env));
    }

    const responseBody: ResponseBody = {
      results: pingDoc.results.map((res) => ({
        region: res.region,
        regionName: awsRegionToName[res.region],
        firstPingLatency: {
          min: res.firstPingLatency,
          max: res.firstPingLatency,
          avg: res.firstPingLatency,
          stdDev: 0,
          p50: res.firstPingLatency,
          p90: res.firstPingLatency,
          p99: res.firstPingLatency,
        },
        secondPingLatency: {
          min: res.secondPingLatency,
          max: res.secondPingLatency,
          avg: res.secondPingLatency,
          stdDev: 0,
          p50: res.secondPingLatency,
          p90: res.secondPingLatency,
          p99: res.secondPingLatency,
        },
      })).sort((a, b) => a.secondPingLatency.avg - b.secondPingLatency.avg),
      pingCount: 1,
      cloudflareDataCenterAirportCode: cloudflareDataCenterId,
      sourceCode: SOURCE_CODE_URL,
    };

    return {
      body: JSON.stringify(responseBody),
      status: 200,
    };
  });
}
