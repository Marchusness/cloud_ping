import { shuffleArray } from "../shuffleArray";

// Regions without data are picked first so a new (or purged) data center fills in every region over its
// first few runs, remaining slots are filled at random. The picked regions are shuffled so that ping order
// isn't tied to whether a region was missing
export function selectRegionsToPing<T>(allRegions: T[], regionsWithData: Set<T>, count: number): T[] {
  const missingRegions = shuffleArray(allRegions.filter((region) => !regionsWithData.has(region)));
  const otherRegions = shuffleArray(allRegions.filter((region) => regionsWithData.has(region)));

  return shuffleArray([...missingRegions, ...otherRegions].slice(0, count));
}
