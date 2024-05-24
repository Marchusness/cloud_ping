import { AWSRegion, ChinaAwsRegion, chinaAwsRegions } from "../constants/aws";

export async function ping(region: (AWSRegion | ChinaAwsRegion)) {
	const url = chinaAwsRegions.includes(region as ChinaAwsRegion) 
	? `http://dynamodb.${region}.amazonaws.com.cn/ping`
	: `http://dynamodb.${region}.amazonaws.com/ping`;

	const start = performance.now();
	await fetch(url);
	const middle = performance.now();
	await fetch(url);
	const end = performance.now();
	
	const firstPingLatency = middle - start;
	const secondPingLatency = end - middle;

	return {
		firstPingLatency,
		secondPingLatency,
	}
}
