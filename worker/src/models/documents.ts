import { AWSRegion, ChinaAwsRegion } from "../constants/aws";

export type PingDocument = {
	results: {
		region: (AWSRegion | ChinaAwsRegion);
		firstPingLatency: number;
		secondPingLatency: number;
	}[];
	cloudflareDataCenterAirportCode: string;
	timestamp: number;
}

export type AvgDocument = {
	results: {
		region: (AWSRegion | ChinaAwsRegion);
		firstPingLatency: number;
		secondPingLatency: number;
	}[];
	cloudflareDataCenterAirportCode: string;
	count: number;
}