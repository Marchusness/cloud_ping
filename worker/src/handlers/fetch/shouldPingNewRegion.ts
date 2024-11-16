
export function shouldPingNewRegion(count: number) {
  const prodOfNewPing = Math.pow(1.5, -(count / 100));

  // At least 1% chance of recalculating
  return Math.max(prodOfNewPing, 0.01) > Math.random();
}
