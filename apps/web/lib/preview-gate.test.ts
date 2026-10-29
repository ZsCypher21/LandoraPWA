import { describe, expect, it } from "vitest";
import { decideGate, parseBasicAuth, safeEqual } from "./preview-gate";

const basic = (user: string, password: string) => `Basic ${btoa(`${user}:${password}`)}`;

describe("client preview gate", () => {
  it("lets local runs through when no password is set", () => {
    expect(decideGate({ hosted: false }, null)).toEqual({ kind: "allow" });
  });

  it("fails closed on a hosted deployment with no password", () => {
    expect(decideGate({ hosted: true }, basic("landora", "x"))).toEqual({ kind: "misconfigured" });
    expect(decideGate({ hosted: true, password: "   " }, null)).toEqual({ kind: "misconfigured" });
  });

  it("challenges missing, malformed and wrong credentials", () => {
    const env = { hosted: true, password: "s3cret" };
    expect(decideGate(env, null)).toEqual({ kind: "challenge" });
    expect(decideGate(env, "Bearer abc")).toEqual({ kind: "challenge" });
    expect(decideGate(env, "Basic !!!")).toEqual({ kind: "challenge" });
    expect(decideGate(env, basic("landora", "wrong"))).toEqual({ kind: "challenge" });
    expect(decideGate(env, basic("someone", "s3cret"))).toEqual({ kind: "challenge" });
  });

  it("allows the right username and password, with a custom username if set", () => {
    expect(decideGate({ hosted: true, password: "s3cret" }, basic("landora", "s3cret"))).toEqual({ kind: "allow" });
    expect(decideGate({ hosted: true, password: "s3cret", user: "client" }, basic("client", "s3cret"))).toEqual({ kind: "allow" });
  });

  it("keeps colons that belong to the password", () => {
    expect(parseBasicAuth(basic("landora", "a:b:c"))).toEqual({ user: "landora", password: "a:b:c" });
  });

  it("compares strings correctly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
