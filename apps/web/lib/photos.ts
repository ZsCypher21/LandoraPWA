// Synthetic listings have no photos of their own. We show freely licensed stock photos from a small
// shared pool (lib/photo-pool.ts), picked deterministically per listing so a listing always shows the
// same photos. They are labelled "Illustrative photo" everywhere: they are never the listed property.

import { PHOTO_POOL } from "./photo-pool";
import type { PropertyType } from "./types";

export type PhotoKind = "house" | "townhouse" | "apartment" | "land" | "interior";

export interface StockPhoto {
  /** Path under /public of the 1280px-wide file, e.g. /listing-photos/house-01.webp */
  src: string;
  /** The same photo 640px wide, for cards and thumbnails. */
  srcSmall: string;
  kind: PhotoKind;
  alt: string;
  width: number;
  height: number;
  creator: string;
  licence: string;
  licenceUrl: string;
  sourceUrl: string;
}

/** Most listing pages show at most this many photos; the rest of a real feed's images would sit behind "See all". */
export const MAX_GALLERY_PHOTOS = 5;

const EXTERIOR_KIND: Record<PropertyType, PhotoKind[]> = {
  house: ["house"],
  townhouse: ["townhouse", "house"],
  unit: ["apartment"],
  apartment: ["apartment"],
  villa: ["house"],
  duplex: ["townhouse", "house"],
  land: ["land"],
  acreage: ["land"],
  other: ["house"],
};

function hash(seed: string): number {
  // FNV-1a: stable across runtimes, so server and client pick the same photo.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function ofKind(pool: readonly StockPhoto[], kinds: PhotoKind[]): StockPhoto[] {
  for (const k of kinds) {
    const found = pool.filter((p) => p.kind === k);
    if (found.length) return found;
  }
  return [];
}

/** `count` distinct photos from `from`, starting at a seeded offset. */
function take(from: StockPhoto[], seed: number, count: number): StockPhoto[] {
  const n = Math.min(count, from.length);
  return Array.from({ length: n }, (_, i) => from[(seed + i) % from.length] as StockPhoto);
}

/**
 * The photos for one listing: an exterior matching its property type first, then interiors.
 * Land gets land photos only. Returns [] when the pool has nothing suitable, so callers fall back to the placeholder.
 */
export function pickPhotos(
  pool: readonly StockPhoto[],
  listing: { id: string; propertyType: PropertyType; imageCount?: number },
  max = MAX_GALLERY_PHOTOS,
): StockPhoto[] {
  const want = Math.max(1, Math.min(listing.imageCount ?? 1, max));
  const h = hash(listing.id);
  const exteriors = ofKind(pool, EXTERIOR_KIND[listing.propertyType]);
  if (!exteriors.length) return [];
  if (listing.propertyType === "land" || listing.propertyType === "acreage") return take(exteriors, h, want);
  const cover = exteriors[h % exteriors.length] as StockPhoto;
  return [cover, ...take(ofKind(pool, ["interior"]), hash(`${listing.id}:interior`), want - 1)];
}

export function listingPhotos(listing: { id: string; propertyType: PropertyType; imageCount?: number }, max?: number): StockPhoto[] {
  return pickPhotos(PHOTO_POOL, listing, max);
}

export function coverPhoto(listing: { id: string; propertyType: PropertyType }): StockPhoto | null {
  return listingPhotos(listing, 1)[0] ?? null;
}
