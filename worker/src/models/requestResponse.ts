import { AWSRegion, ChinaAwsRegion } from "../constants/aws";

export type RequestBody = {
  onNoCache: {
    optimiseForRegions: (AWSRegion | ChinaAwsRegion)[];
  };
  resultsForCloudflareDataCenterId?: undefined;
} | {
  onNoCache?: {
    optimiseForRegions: undefined;
  };
  resultsForCloudflareDataCenterId: string;
} | {
  onNoCache?: {
    optimiseForRegions: undefined;
  };
  resultsForCloudflareDataCenterId?: undefined;
} | undefined;

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
