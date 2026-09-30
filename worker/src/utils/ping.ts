import { AWSRegion, ChinaAwsRegion } from "../constants/aws";

const PING_TIMEOUT_MS = 10_000;

function getEndpoint(region: AWSRegion | ChinaAwsRegion): string {
  if (region.startsWith("cn-")) {
    return `http://dynamodb.${region}.amazonaws.com.cn/ping`;
  }

  return `http://dynamodb.${region}.amazonaws.com/ping`;
}

async function timedFetch(url: string) {
  const start = performance.now();
  const response = await fetch(url, {
    signal: AbortSignal.timeout(PING_TIMEOUT_MS),
  });
  // Read the body so the connection is released (and can be reused by the next ping)
  // instead of being held open until it is garbage collected
  await response.arrayBuffer();
  return performance.now() - start;
}

export async function ping(region: (AWSRegion | ChinaAwsRegion)) {
  const url = getEndpoint(region);

  const firstPingLatency = await timedFetch(url);
  const secondPingLatency = await timedFetch(url);

  return {
    firstPingLatency,
    secondPingLatency,
  };
}
