# Cloud Ping
Simple api that returns the latency data from the closest cloudflare region to all aws regions.

### How it works
The api will get the cloudflare data center code from the worker handling the request using `request.cf?.colo`. The KV is checked to see if the latency data has been calculated and cached for the current cloudflare data center code. The API will return the latency stats that was stored. After the request returned the stats, the worker will ping all aws regions and update the D1 with the first and second latency ping. A cron job runs every 10 minutes to calculate the latency stats from d1 and store the stats in KV.

### API
```
GET or POST 
https://api.cloudping.dev
```

##### Query parameters
- `cloudflareDataCenterAirportCode` - The airport code of the cloudflare data center. Complete list https://www.feitsui.com/en/article/26. This is optional. If not provided, the closest cloudflare data center to the user will be used. eg. https://api.cloudping.dev?cloudflareDataCenterAirportCode=SYD

##### Response format
```ts
type AnalyticDocument = {
  results: {
    region: (AWSRegion | ChinaAwsRegion);
    regionName: string;
    firstPingAnalytics: {
      min: number;
      max: number;
      avg: number;
      stdDev: number;
      p50: number;
      p90: number;
      p99: number;
    };
    secondPingAnalytics: {
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
  pingCount: number;
  sourceCode: string;
}
```

### Example use case
You are using cloudflare worker as a reverse proxy to your aws infrastructure. Your infrastructure is deployed in multiple regions. You want to know the latency from the current cloudflare data center to all aws regions so you can route the traffic to the closest region.

Example Cloudflare Worker code
```ts
import { AWS_REGION_TO_ENDPOINT, DEFAULT_ENDPOINT } from "./awsRegionMapper";
import { getAws4FetchClient } from "./aws4FetchClient";

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const currentDataCenter = request.cf.colo;
    const response = await fetch(`https://api.cloudping.dev?cloudflareDataCenterAirportCode=${currentDataCenter}`);

    const data = await response.json() as {
      results: {
        region: string;
        secondPingAnalytics: {
          avg: number;
        };
      }[];
    };

    const closestRegion = data.results
      .sort((a, b) => a.secondPingAnalytics.avg - b.secondPingAnalytics.avg)
      .filter((res) => AWS_REGION_TO_ENDPOINT[res.region])[0];

    const closestRegionEndpoint = AWS_REGION_TO_ENDPOINT[closestRegion.region] ?? DEFAULT_ENDPOINT;

    return getAws4FetchClient(env).fetch(closestRegionEndpoint);
  }
} satisfies ExportedHandler<Env>;
```