import { AWSRegion, ChinaAwsRegion } from "../constants/aws";

export type RequestBody = {}

export type ResponseBody = {
	results: {
		region: (AWSRegion | ChinaAwsRegion);
		name: string;
		firstPingLatency: number;
		secondPingLatency: number;
	}[];
	cloudflareDataCenterAirportCode: string;
	averageFromPingCount: number;
	sourceCode: string;
}
