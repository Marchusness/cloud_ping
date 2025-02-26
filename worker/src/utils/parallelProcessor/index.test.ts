import {
  describe, expect, it
} from "vitest";
import { parallelProcessor } from "./index";

describe("parallelProcessor", () => {
  it("should process all items", async () => {
    const items = [1, 2, 3, 4, 5];
    const processFn = async (item: number) => item * 2;

    const results = await parallelProcessor(items, processFn);

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("should limit concurrency to specified amount", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const processFn = async (item: number) => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

      // Simulate work with different durations
      await new Promise((resolve) => setTimeout(resolve, item * 10));

      currentConcurrent--;
      return item * 2;
    };

    const results = await parallelProcessor([1, 2, 3, 4, 5, 6, 7, 8], processFn, 3);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
  });

  it("should handle empty arrays", async () => {
    const processFn = async (item: number) => item * 2;
    const results = await parallelProcessor([], processFn);
    expect(results).toEqual([]);
  });

  it("should maintain the order of results", async () => {
    const items = [100, 50, 25, 10, 5]; // Decreasing delays

    const processFn = async (item: number) => {
      await new Promise((resolve) => setTimeout(resolve, item));
      return item * 2;
    };

    const results = await parallelProcessor(items, processFn, 3);

    // Results should be in the same order as inputs, not completion order
    expect(results).toEqual([200, 100, 50, 20, 10]);
  });

  it("should throw error if concurrency is not positive", async () => {
    const processFn = async (item: number) => item * 2;

    await expect(parallelProcessor([1, 2, 3], processFn, 0)).rejects.toThrow("Concurrency must be a positive number");

    await expect(parallelProcessor([1, 2, 3], processFn, -1)).rejects.toThrow("Concurrency must be a positive number");
  });

  it("should propagate errors from the processing function", async () => {
    const processFn = async (item: number) => {
      if (item === 3) throw new Error("Test error");
      return item * 2;
    };

    await expect(parallelProcessor([1, 2, 3, 4, 5], processFn)).rejects.toThrow("Test error");
  });
});
