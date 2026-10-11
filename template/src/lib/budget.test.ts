import { describe, expect, it } from "vitest";
import { Budget } from "./budget";

describe("Budget", () => {
  it("refuses a call that could pass the cap, counting calls already reserved", () => {
    const b = new Budget(5_000);
    expect(b.reserve(2_000)).toBe(true);
    expect(b.reserve(2_000)).toBe(true);
    expect(b.reserve(2_000)).toBe(false);
    expect(b.room).toBe(1_000);
  });
  it("settles a reservation with the real cost and frees the difference", () => {
    const b = new Budget(5_000);
    b.reserve(2_000);
    b.settle(2_000, 500);
    expect(b.spent).toBe(500);
    expect(b.room).toBe(4_500);
  });
  it("always lets a free call through, even at the cap", () => {
    const b = new Budget(0);
    expect(b.reserve(0)).toBe(true);
    expect(b.reserve(1)).toBe(false);
  });
});
