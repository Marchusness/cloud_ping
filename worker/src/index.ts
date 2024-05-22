
const SOURCE_CODE_URL = "https://github.com/Marchusness/cloud_ping"

const awsRegions = [
    "us-east-2",
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "af-south-1",
    "ap-east-1",
    "ap-south-2",
    "ap-southeast-3",
    "ap-southeast-4",
    "ap-south-1",
    "ap-northeast-3",
    "ap-northeast-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ca-central-1",
    "ca-west-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-south-1",
    "eu-west-3",
    "eu-south-2",
    "eu-north-1",
    "eu-central-2",
    "il-central-1",
    "me-south-1",
    "me-central-1",
    "sa-east-1",
] as const;

const chinaAwsRegions = [
	"cn-north-1",
	"cn-northwest-1"
] as const;

type AWSRegion = typeof awsRegions[number];
type ChinaAwsRegion = typeof chinaAwsRegions[number];

const awsRegionToName: Record<AWSRegion | ChinaAwsRegion, string> = {
	"us-east-2": "US East (Ohio)",
	"us-east-1": "US East (Virginia)",
	"us-west-1": "US West (N. California)",
	"us-west-2": "US West (Oregon)",
	"af-south-1": "Africa (Cape Town)",
	"ap-east-1": "Asia Pacific (Hong Kong)",
	"ap-south-2": "Asia Pacific (Hyderabad)",
	"ap-southeast-3": "Asia Pacific (Jakarta)",
	"ap-southeast-4": "Asia Pacific (Melbourne)",
	"ap-south-1": "Asia Pacific (Mumbai)",
	"ap-northeast-3": "Asia Pacific (Osaka)",
	"ap-northeast-2": "Asia Pacific (Seoul)",
	"ap-southeast-1": "Asia Pacific (Singapore)",
	"ap-southeast-2": "Asia Pacific (Sydney)",
	"ap-northeast-1": "Asia Pacific (Tokyo)",
	"ca-central-1": "Canada (Central)",
	"ca-west-1": "Canada West (Calgary)",
	"eu-central-1": "Europe (Frankfurt)",
	"eu-west-1": "Europe (Ireland)",
	"eu-west-2": "Europe (London)",
	"eu-south-1": "Europe (Milan)",
	"eu-west-3": "Europe (Paris)",
	"eu-south-2": "Europe (Spain)",
	"eu-north-1": "Europe (Stockholm)",
	"eu-central-2": "Europe (Zurich)",
	"il-central-1": "Israel (Tel Aviv)",
	"me-south-1": "Middle East (Bahrain)",
	"me-central-1": "Middle East (UAE)",
	"sa-east-1": "South America (São Paulo)",
	"cn-north-1": "China (Beijing)",
	"cn-northwest-1": "China (Ningxia)"
}

async function ping(region: (AWSRegion | ChinaAwsRegion)) {
	const url = chinaAwsRegions.includes(region as ChinaAwsRegion) 
	? `http://dynamodb.${region}.amazonaws.com.cn/ping`
	: `http://dynamodb.${region}.amazonaws.com/ping`;

	const start = performance.now();
	await fetch(url, { method: "HEAD" });
	const end = performance.now();
	return end - start;
}

type RequestBody = {}

type ResponseBody = {
	results: {
		region: (AWSRegion | ChinaAwsRegion);
		name: string;
		latency: number;
	}[];
	cloudflareDataCenterAirportCode: string;
	averageFromPingCount: number;
	sourceCode: string;
}

type PingDocument = {
	results: {
		region: (AWSRegion | ChinaAwsRegion);
		latency: number;
	}[];
	cloudflareDataCenterAirportCode: string;
	timestamp: number;
}

type AvgDocument = {
	results: {
		region: (AWSRegion | ChinaAwsRegion);
		latency: number;
	}[];
	cloudflareDataCenterAirportCode: string;
	count: number;
}

function probabilityOfNewPing(count: number) {
	// 1.5 ^ -(x/100)
	return Math.pow(1.5, -(count / 100));
}

async function uploadLatenciesToStore(cloudflareDataCenterId: string, env: Env) {
	const allRegions = (awsRegions as unknown as string[]).concat(chinaAwsRegions) as (AWSRegion | ChinaAwsRegion)[];

	let results: PingDocument["results"] = [];

	for (const region of allRegions) {
		const latency = await ping(region);
		results.push({
			region,
			latency,
		});
	}

	const randomString = crypto.randomUUID().replaceAll("-", "");

	const store: PingDocument = {
		results,
		timestamp: Date.now(),
		cloudflareDataCenterAirportCode: cloudflareDataCenterId,
	}

	await env.LATENCIES_STORE.put("ping:" + cloudflareDataCenterId + ":" + randomString, JSON.stringify(store));

	return store;
}


export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		const pingKeys = await env.LATENCIES_STORE.list({ prefix: "ping:", limit: 400});

		// get unique set of cloudflare airport codes
		const cloudflareAirportCodes = new Set<string>();
		for (const key of pingKeys.keys) {
			cloudflareAirportCodes.add(key.name.split(":")[1]);
		}

		// get avg latencies for each cloudflare airport code
		const avgLatencies: Record<string, AvgDocument> = {};
		for (const code of cloudflareAirportCodes) {
			const avg = await env.LATENCIES_STORE.get("avg:" + code, { type: "json" }) as AvgDocument | undefined;

			if (avg) {
				avgLatencies[code] = avg;
			} else {
				avgLatencies[code] = {
					results: [],
					count: 0,
					cloudflareDataCenterAirportCode: code,
				}
			}
		}

		// merge new ping results with avg latencies
		for (const key of pingKeys.keys) {
			const ping = await env.LATENCIES_STORE.get(key.name, { type: "json" }) as PingDocument;
			await env.LATENCIES_STORE.put(key.name.replace("ping:", "recorded:"), JSON.stringify(ping));

			const avg = avgLatencies[ping.cloudflareDataCenterAirportCode];

			const newResults = ping.results.map((res) => {
				const existingResult = avg.results.find((r) => r.region === res.region);

				if (!existingResult) {
					return res;
				}
				
				return {
					region: res.region,
					latency: (existingResult.latency * avg.count + res.latency) / (avg.count + 1),
				}
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
		if (request.method !== "POST" && request.method !== "GET") {
			return new Response(null, {
				status: 405,
				statusText: "Method Not Allowed",
			});
		}

		let requestBody: RequestBody = {};
		try {
			requestBody = await request.json();
		} catch (error) {
			// Do nothing
		}

		const cloudflareDataCenterId = request.cf?.colo as string;

		const avgLatency = await env.LATENCIES_STORE.get("avg:" + cloudflareDataCenterId, { type: "json" }) as AvgDocument | undefined;

		if (avgLatency) {
			const responseBody: ResponseBody = {
				results: avgLatency.results.map((res) => ({
					region: res.region,
					latency: res.latency,
					name: awsRegionToName[res.region],
				})),
				averageFromPingCount: avgLatency.count,
				cloudflareDataCenterAirportCode: cloudflareDataCenterId,
				sourceCode: SOURCE_CODE_URL,
			}

			if (probabilityOfNewPing(avgLatency.count) > Math.random()) {
				ctx.waitUntil(uploadLatenciesToStore(cloudflareDataCenterId, env));
			}

			return new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: {
					"content-type": "application/json",
				},
			});
		} 

		let responseBody: ResponseBody;

		const latenciesKeys = await env.LATENCIES_STORE.list({ prefix: "ping:" + cloudflareDataCenterId });
		
		if (latenciesKeys.keys.length === 0) {
			const pingDoc = await uploadLatenciesToStore(cloudflareDataCenterId, env);
			responseBody = {
				results: pingDoc.results.map((res) => ({
					region: res.region,
					latency: res.latency,
					name: awsRegionToName[res.region],
				})),
				cloudflareDataCenterAirportCode: cloudflareDataCenterId,
				averageFromPingCount: 1,
				sourceCode: SOURCE_CODE_URL,
			};
		} else {
			const res = await env.LATENCIES_STORE.get(latenciesKeys.keys[0].name, { type: "json" }) as PingDocument;
			responseBody = {
				results: res.results.map((res) => ({
					region: res.region,
					latency: res.latency,
					name: awsRegionToName[res.region],
				})),
				averageFromPingCount: 1,
				cloudflareDataCenterAirportCode: cloudflareDataCenterId,
				sourceCode: SOURCE_CODE_URL,
			}

			ctx.waitUntil(uploadLatenciesToStore(cloudflareDataCenterId, env));
		}
	
		return new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	},
};
