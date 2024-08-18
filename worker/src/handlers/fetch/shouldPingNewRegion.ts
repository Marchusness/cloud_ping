
export function shouldPingNewRegion(count: number) {
  // 1.5 ^ -(x/100)
  return Math.pow(1.5, -(count / 100)) > Math.random();
}
