import { AWSRegion, ChinaAwsRegion } from "../constants/aws";

export type PingDocument = {
  results: {
    region: (AWSRegion | ChinaAwsRegion);
    firstPingLatency: number;
    secondPingLatency: number;
    // Optional as ping documents written before ping order was recorded don't have it
    pingOrder?: number;
  }[];
  cloudflareDataCenterAirportCode: string;
  timestamp: number;
}

export type StatsDocument = {
  results: {
    region: (AWSRegion | ChinaAwsRegion);
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
