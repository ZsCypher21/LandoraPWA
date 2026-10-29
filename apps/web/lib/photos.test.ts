import { describe, expect, it } from "vitest";
import { pickPhotos, type PhotoKind, type StockPhoto } from "./photos";

function photo(kind: PhotoKind, n: number): StockPhoto {
  return {
    src: `/listing-photos/${kind}-${n}.webp`,
    srcSmall: `/listing-photos/${kind}-${n}-640.webp`,
    kind,
    alt: `${kind} ${n}`,
    width: 1280,
    height: 853,
    creator: "Test",
    licence: "CC0 1.0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: "https://example.org",
  };
}

const POOL = [
  ...[1, 2, 3].map((n) => photo("house", n)),
  ...[1, 2].map((n) => photo("apartment", n)),
  ...[1, 2].map((n) => photo("land", n)),
  ...[1, 2, 3, 4, 5, 6].map((n) => photo("interior", n)),
];

describe("pickPhotos", () => {
  it("is deterministic per listing and leads with an exterior of the right kind", () => {
    const a = pickPhotos(POOL, { id: "listing-a", propertyType: "unit", imageCount: 8 });
    expect(a).toEqual(pickPhotos(POOL, { id: "listing-a", propertyType: "unit", imageCount: 8 }));
    expect(a).toHaveLength(5);
    expect(a[0]?.kind).toBe("apartment");
    expect(a.slice(1).every((p) => p.kind === "interior")).toBe(true);
    expect(new Set(a.map((p) => p.src)).size).toBe(a.length);
  });

  it("falls back to house photos for townhouses when the pool has none", () => {
    expect(pickPhotos(POOL, { id: "t", propertyType: "townhouse", imageCount: 1 })[0]?.kind).toBe("house");
  });

  it("gives land only land photos, capped by the pool and the listing's image count", () => {
    const land = pickPhotos(POOL, { id: "l", propertyType: "land", imageCount: 3 });
    expect(land).toHaveLength(2);
    expect(land.every((p) => p.kind === "land")).toBe(true);
    expect(pickPhotos(POOL, { id: "l", propertyType: "land", imageCount: 1 })).toHaveLength(1);
  });

  it("spreads covers across the pool and returns nothing when the pool has no match", () => {
    const covers = new Set(Array.from({ length: 50 }, (_, i) => pickPhotos(POOL, { id: `h${i}`, propertyType: "house" })[0]?.src));
    expect(covers.size).toBe(3);
    expect(pickPhotos([], { id: "x", propertyType: "house" })).toEqual([]);
  });
});
