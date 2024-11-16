import { StatsDocument } from "./documents";

export type RequestData = {
  resultsForCloudflareDataCenterId?: string;
}

export type ResponseBody = {
  results: (StatsDocument["results"][number] & {
    regionName: string;
  })[];
  cloudflareDataCenterAirportCode: string;
  pingCount: number;
  sourceCode: string;
}
