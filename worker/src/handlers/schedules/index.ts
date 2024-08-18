import { AvgDocument, PingDocument } from "../../models/documents";

export async function scheduledHandler(event: ScheduledEvent, env: Env) {
  const pingKeys = await env.LATENCIES_STORE.list({
    prefix: "ping:",
    limit: 400,
  });

  // get unique set of cloudflare airport codes
  const cloudflareAirportCodes = new Set<string>();
  for (const key of pingKeys.keys) {
    cloudflareAirportCodes.add(key.name.split(":")[1]);
  }

  // get avg latencies for each cloudflare airport code
  const avgLatencies: Record<string, AvgDocument> = {};
  for (const code of cloudflareAirportCodes) {
    const avg = await env.LATENCIES_STORE.get("avg:" + code, {
      type: "json",
    }) as AvgDocument | undefined;

    if (avg) {
      avgLatencies[code] = avg;
    } else {
      avgLatencies[code] = {
        results: [],
        count: 0,
        cloudflareDataCenterAirportCode: code,
      };
    }
  }

  // merge new ping results with avg latencies
  for (const key of pingKeys.keys) {
    const ping = await env.LATENCIES_STORE.get(key.name, {
      type: "json",
    }) as PingDocument;
    await env.LATENCIES_STORE.put(key.name.replace("ping:", "recorded:"), JSON.stringify(ping));

    const avg = avgLatencies[ping.cloudflareDataCenterAirportCode];

    const newResults = ping
      .results
      .map((res) => {
        const existingResult = avg.results.find((r) => r.region === res.region);

        if (!existingResult) {
          return res;
        }

        return {
          region: res.region,
          firstPingLatency: (existingResult.firstPingLatency * avg.count + res.firstPingLatency) / (avg.count + 1),
          secondPingLatency: (existingResult.secondPingLatency * avg.count + res.secondPingLatency) / (avg.count + 1),
        };
      })
      .sort((a, b) => {
        return a.secondPingLatency - b.secondPingLatency;
      });

    avg.results = newResults;
    avg.count += 1;
  }

  // save avg latencies back to store
  for (const code of cloudflareAirportCodes) {
    await env.LATENCIES_STORE.put("avg:" + code, JSON.stringify(avgLatencies[code]));
  }

  // delete ping results
  for (const key of pingKeys.keys) {
    await env.LATENCIES_STORE.delete(key.name);
  }
}
