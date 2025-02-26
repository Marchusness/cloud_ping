export const awsRegions = [
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

export const chinaAwsRegions = ["cn-north-1", "cn-northwest-1"] as const;

export type AWSRegion = (typeof awsRegions)[number];
export type ChinaAwsRegion = (typeof chinaAwsRegions)[number];

export type StatsDocument = {
  results: {
    region: AWSRegion | ChinaAwsRegion;
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
};

export type ResponseBody = {
  results: (StatsDocument["results"][number] & {
    regionName: string;
  })[];
  cloudflareDataCenterAirportCode: string;
  pingCount: number;
  sourceCode: string;
};

export async function getLatencies(fromCloudflareRegion?: string) {
  let url = `https://api.cloudping.dev`;
  if (fromCloudflareRegion) {
    url += `?cloudflareDataCenterAirportCode=${fromCloudflareRegion}`;
  }

  const response = await fetch(url, {
    cf: {
      cacheTtl: 60 * 60 * 24, // 1 day
      cacheEverything: true,
    },
  } as RequestInit);
  const data = (await response.json()) as ResponseBody;
  return data;
}
