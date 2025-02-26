
const MIX_PING_PROBABILITY = 0.05;

export function shouldPingNewRegion(count?: number) {
  if (!count) {
    return Math.random() < MIX_PING_PROBABILITY;
  }

  const prodOfNewPing = Math.pow(1.5, -(count / 100));

  // At least 5% chance of recalculating
  return Math.max(prodOfNewPing, MIX_PING_PROBABILITY) > Math.random();
}
