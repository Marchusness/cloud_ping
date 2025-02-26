import {
  describe, expect, it
} from "vitest";
import { shuffleArray } from "./index";

describe("shuffleArray", () => {
  it("should return an array of the same length", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(input.length);
  });

  it("should contain all the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it("should not modify the original array", () => {
    const input = [1, 2, 3, 4, 5];
    const originalInput = [...input];
    shuffleArray(input);
    expect(input).toEqual(originalInput);
  });

  it("should handle empty arrays", () => {
    const input: number[] = [];
    const result = shuffleArray(input);
    expect(result).toEqual([]);
  });

  it("should handle arrays with one element", () => {
    const input = [1];
    const result = shuffleArray(input);
    expect(result).toEqual([1]);
  });
});
