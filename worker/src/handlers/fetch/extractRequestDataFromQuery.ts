import { RequestData } from "../../models/requestResponse";

export function extractRequestData(request: Request): RequestData {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const cloudflareDataCenterAirportCode = searchParams.get("cloudflareDataCenterAirportCode")?.toUpperCase();

  return {
    resultsForCloudflareDataCenterId: cloudflareDataCenterAirportCode || undefined,
  };
}
