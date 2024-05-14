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

function isAwsRegion(region: string): region is (AWSRegion | ChinaAwsRegion) {
	return awsRegions.includes(region as AWSRegion) || chinaAwsRegions.includes(region as ChinaAwsRegion);;
}

async function ping(region: (AWSRegion | ChinaAwsRegion)) {
	const url = chinaAwsRegions.includes(region as ChinaAwsRegion) 
	? `https://dynamodb.${region}.amazonaws.com.cn/ping`
	: `https://dynamodb.${region}.amazonaws.com/ping`;

	const start = Date.now();
	const response = await fetch(url);
	const end = Date.now();

	const latency = end - start;
	return latency;
}

function removeDuplicates<T>(value: T, index: number, self: T[]) {
	return self.indexOf(value) === index;
}

type RequestBody = {
	regions?: (AWSRegion | ChinaAwsRegion)[];
	includeChina?: boolean;
}

type ResponseBody = {
	results: {
		region: (AWSRegion | ChinaAwsRegion);
		name: string;
		latency: number;
	}[];
	timestamp: number;
}

export default {
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
			
		let regions = requestBody
			.regions
			?.filter(isAwsRegion)
			?.filter(removeDuplicates)

		if (!regions || regions.length === 0) {
			regions = (awsRegions as unknown as AWSRegion[])
				.concat((requestBody.includeChina ?? false) 
					? chinaAwsRegions as unknown as AWSRegion[] 
					: []
				);
		}

		const cloudflareDataCenterId = request.cf?.colo as string;

		const uploadLatenciesToStore = (async () => {
			let results: ResponseBody["results"] = [];

			for (const region of regions) {
				const latency = await ping(region);
				results.push({
					region,
					name: awsRegionToName[region],
					latency,
				});
			}

			const randomString = Math.random().toString(36).substring(7);

			const store: ResponseBody = {
				results,
				timestamp: Date.now(),
			}

			await env.LATENCIES_STORE.put(cloudflareDataCenterId + ":" + randomString, JSON.stringify(store));

			return store;
		})
	
		const latenciesKeys = await env.LATENCIES_STORE.list({ prefix: cloudflareDataCenterId });

		let responseBody: ResponseBody;
		if (latenciesKeys.keys.length === 0) {
			responseBody = await uploadLatenciesToStore();
		} else {
			const res = await env.LATENCIES_STORE.get(latenciesKeys.keys[0].name) as string;
			responseBody = JSON.parse(res);

			if (latenciesKeys.keys.length < 500) {
				ctx.waitUntil(uploadLatenciesToStore());
			}
		}

		return new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	},
};
