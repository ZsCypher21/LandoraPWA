import { coverPhoto, type StockPhoto } from "@/lib/photos";
import type { PropertyType } from "@/lib/types";

// Synthetic listings use freely licensed stock photos from a shared pool (lib/photos.ts). They are not the
// property, so every photo carries an "Illustrative photo" badge. With no suitable photo we draw a labelled
// placeholder instead.

const PALETTES = [
  ["#dff3ea", "#b9e4d1", "#0e8a67"],
  ["#e4edf8", "#c4d6ef", "#2f5f9e"],
  ["#f6ecdc", "#ecd6b3", "#9a6a22"],
  ["#ebe6f6", "#d3c8ee", "#5e478f"],
  ["#e1f1f4", "#bfe0e7", "#1d6f80"],
] as const;

function Badge({ small, children }: { small: boolean; children: string }) {
  return (
    <span
      className={`absolute rounded-md bg-white/90 font-semibold uppercase tracking-wide text-muted ${
        small ? "bottom-1 left-1 px-1 text-[9px]" : "bottom-2 left-2 px-1.5 py-0.5 text-[10px]"
      }`}
    >
      {children}
    </span>
  );
}

export function StockPhotoImage({
  photo,
  label,
  className = "",
  small = false,
  sizes,
  priority = false,
}: {
  photo: StockPhoto;
  label: string;
  className?: string;
  small?: boolean;
  /** The image's rendered width, for picking the 640px or 1280px file. */
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-canvas ${className}`}>
      {/* Pre-sized WebP files in /public, so a plain img with srcSet is enough; no image optimiser needed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.srcSmall}
        srcSet={`${photo.srcSmall} 640w, ${photo.src} 1280w`}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={`Illustrative photo for ${label}, not the actual property: ${photo.alt}`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <Badge small={small}>{small ? "Illustrative" : "Illustrative photo"}</Badge>
    </div>
  );
}

export function ListingImage({
  seed,
  label,
  propertyType,
  className = "",
  small = false,
  sizes = "(min-width: 640px) 33vw, 100vw",
}: {
  seed: string;
  label: string;
  propertyType: PropertyType;
  className?: string;
  small?: boolean;
  sizes?: string;
}) {
  const photo = coverPhoto({ id: seed, propertyType });
  if (photo) return <StockPhotoImage photo={photo} label={label} className={className} small={small} sizes={sizes} />;

  const n = [...seed].reduce((s, c) => s + c.charCodeAt(0), 0);
  const [from, to, fg] = PALETTES[n % PALETTES.length] as (typeof PALETTES)[number];
  return (
    <div
      className={`relative flex items-end justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` }}
      role="img"
      aria-label={`Placeholder image for ${label}`}
    >
      <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <circle cx="38" cy="30" r="12" fill="#fff" opacity="0.55" />
        <path d="M0 98c30-10 60-12 100-4s70 8 100-2v28H0z" fill={fg} opacity="0.12" />
        <g fill={fg} opacity="0.88">
          <path d="M100 40 66 66h8v34h18V84h16v16h18V66h8z" />
        </g>
        <path d="M0 106c40-6 80-6 120 0s60 4 80 0v14H0z" fill={fg} opacity="0.18" />
      </svg>
      <Badge small={small}>{small ? "Synthetic" : "Synthetic photo"}</Badge>
    </div>
  );
}
