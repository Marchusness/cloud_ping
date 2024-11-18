import { AWSRegion, ChinaAwsRegion } from "../constants/aws";

function getEndpoint(region: AWSRegion | ChinaAwsRegion): string {
  if (region.startsWith("cn-")) {
    return `http://dynamodb.${region}.amazonaws.com.cn/ping`;
  }

  return `http://dynamodb.${region}.amazonaws.com/ping`;
}

export async function ping(region: (AWSRegion | ChinaAwsRegion)) {
  const url = getEndpoint(region);

  const start = performance.now();
  await fetch(url);
  const middle = performance.now();
  await fetch(url);
  const end = performance.now();

  const firstPingLatency = middle - start;
  const secondPingLatency = end - middle;

  return {
    firstPingLatency,
    secondPingLatency,
  };
}
