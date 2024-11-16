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

export type StatsDocument = {
  results: {
    region: (AWSRegion | ChinaAwsRegion);
    firstPingLatency: {
      min: number;
      max: number;
      avg: number;
      stdDev: number;
      p50: number;
      p90: number;
      p99: number;
    };
    secondPingLatency: {
      min: number;
      max: number;
      avg: number;
      stdDev: number;
      p50: number;
      p90: number;
      p99: number;
    };
  }[];
  cloudflareDataCenterAirportCode: string;
  count: number;
}
