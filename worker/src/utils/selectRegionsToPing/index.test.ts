import {
  describe, expect, it
} from "vitest";
import { selectRegionsToPing } from "./index";

describe("selectRegionsToPing", () => {
  const allRegions = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("should return count unique regions", () => {
    const result = selectRegionsToPing(allRegions, new Set(), 5);
    expect(result).toHaveLength(5);
    expect(new Set(result).size).toBe(5);
  });

  it("should pick regions without data first", () => {
    const result = selectRegionsToPing(allRegions, new Set(["a", "b", "c", "d", "e", "f"]), 5);
    expect(result).toContain("g");
    expect(result).toContain("h");
  });

  it("should only pick regions without data when there are enough of them", () => {
    const result = selectRegionsToPing(allRegions, new Set(["a", "b"]), 5);
    expect(result.every((region) => region !== "a" && region !== "b")).toBe(true);
  });

  it("should return every region when count is larger than the region list", () => {
    const result = selectRegionsToPing(allRegions, new Set(), 50);
    expect([...result].sort()).toEqual(allRegions);
  });
});
