# Cloud Ping
Simple api that returns the latency data from the closest cloudflare region to all aws regions.

### API
```
GET or POST 
https://api.cloudping.dev
```

##### Query parameters
- `cloudflareDataCenterAirportCode` - The airport code of the cloudflare data center. Complete list https://www.feitsui.com/en/article/26. This is optional. If not provided, the closest cloudflare data center to the user will be used. eg. https://api.cloudping.dev?cloudflareDataCenterAirportCode=JFK

##### Response format
```ts
type AnalyticDocument = {
  results: {
    region: (AWSRegion | ChinaAwsRegion);
    regionName: string;
    firstPingLatency: number;
    secondPingLatency: number;
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
export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const currentDataCenter = request.cf.colo;
    
    const response = await fetch(`https://api.cloudping.dev?cloudflareDataCenterAirportCode=${cloudflareDataCenterAirportCode}`);


    return response;
  }
} satisfies ExportedHandler<Env>;