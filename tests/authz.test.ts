import { describe, expect, it } from "vitest";
import { canCreateCoderForClass, canMoveCoderFromClass } from "../supabase/functions/_shared/authz.ts";

describe("authz role checks", () => {
  it("allows center lead for coder creation", () => {
    expect(canCreateCoderForClass("center_lead", "u1", "u2")).toBe(true);
  });

  it("allows coach only for own class on coder creation", () => {
    expect(canCreateCoderForClass("coach", "coach-1", "coach-1")).toBe(true);
    expect(canCreateCoderForClass("coach", "coach-1", "coach-2")).toBe(false);
  });

  it("blocks coder role for coder creation", () => {
    expect(canCreateCoderForClass("coder", "u1", "u1")).toBe(false);
  });

  it("allows move by center lead and owning coach only", () => {
    expect(canMoveCoderFromClass("center_lead", "u1", "u2")).toBe(true);
    expect(canMoveCoderFromClass("coach", "coach-1", "coach-1")).toBe(true);
    expect(canMoveCoderFromClass("coach", "coach-1", "coach-2")).toBe(false);
  });
});

