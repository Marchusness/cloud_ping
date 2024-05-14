/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const TOP_K_REACHED = "Top K reached";

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
    "us-gov-east-1",
    "us-gov-west-1"
] as const;

const chinaAwsRegions = [
	"cn-north-1",
	"cn-northwest-1"
] as const;

type AWSRegion = typeof awsRegions[number];
type ChinaAwsRegion = typeof chinaAwsRegions[number];


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
	testRegions?: (AWSRegion | ChinaAwsRegion)[];
	topK?: number;
}

type ResponseBody = {
	results: {
		region: (AWSRegion | ChinaAwsRegion);
		latency: number;
	}[];
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method !== "POST" && request.method !== "GET") {
			return new Response(null, {
				status: 405,
				statusText: "Method Not Allowed",
			});
		}

		const body: RequestBody = await request.json() ?? {};

		const results: ResponseBody["results"] = [];

		let regions = body
			.testRegions
			?.filter(isAwsRegion)
			?.filter(removeDuplicates)

		if (!regions || regions.length === 0) {
			regions = (awsRegions as unknown as AWSRegion[]).concat(chinaAwsRegions as unknown as AWSRegion[]);
		}

		const topK = Math.max(
			1,
			Math.min(
				body.topK ?? regions.length, 
				regions.length
			), 
		);

		const shouldEarlyReturn = topK !== regions.length;

		try {
			await Promise.all(regions.map(async (region) => {
				const latency = await ping(region);
				const length = results.push({ region, latency });

				if (length >= topK && shouldEarlyReturn) {
					throw TOP_K_REACHED;
				}
			}));
		} catch (error) {
			if (error !== TOP_K_REACHED) {
				return new Response(null, {
					status: 500,
					statusText: "Internal Server Error",
				});
			}
		}

		const responseBody: ResponseBody = {
			results,
		};
		
		return new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	},
};
