import { ListingImage, StockPhotoImage } from "@/components/ListingImage";
import { listingPhotos } from "@/lib/photos";
import type { ListingDetail } from "@/lib/types";

// Listing page photos. One element tree for both layouts, so no photo is fetched twice: a swipeable
// strip on phones, a cover-plus-thumbnails grid from the sm breakpoint. No JavaScript needed.

// Literal class strings so Tailwind can see them, keyed by photo count.
const GRID: Record<number, { grid: string; cover: string }> = {
  2: { grid: "sm:grid-cols-2 sm:grid-rows-1", cover: "" },
  3: { grid: "sm:grid-cols-3 sm:grid-rows-2", cover: "sm:col-span-2 sm:row-span-2" },
  4: { grid: "sm:grid-cols-3 sm:grid-rows-3", cover: "sm:col-span-2 sm:row-span-3" },
  5: { grid: "sm:grid-cols-4 sm:grid-rows-2", cover: "sm:col-span-2 sm:row-span-2" },
};

export function ListingGallery({ listing: l }: { listing: ListingDetail }) {
  const photos = listingPhotos(l);
  if (photos.length === 0) {
    return <ListingImage seed={l.id} label={l.displayAddress} propertyType={l.propertyType} sizes="100vw" className="-mx-4 aspect-[4/3] sm:mx-0 sm:aspect-[21/9] sm:rounded-3xl" />;
  }
  if (photos.length === 1) {
    const [photo] = photos as [(typeof photos)[number]];
    return (
      <figure className="flex flex-col gap-2">
        <StockPhotoImage photo={photo} label={l.displayAddress} priority sizes="100vw" className="-mx-4 aspect-[4/3] sm:mx-0 sm:aspect-[21/9] sm:rounded-3xl" />
        <PhotoCredits photos={photos} />
      </figure>
    );
  }

  const layout = GRID[photos.length] ?? GRID[5]!;
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative -mx-4 sm:mx-0">
        <ul
          className={`flex snap-x snap-mandatory gap-1 overflow-x-auto sm:grid sm:aspect-[21/9] sm:gap-2 sm:overflow-hidden sm:rounded-3xl ${layout.grid}`}
          aria-label={`${photos.length} illustrative photos`}
        >
          {photos.map((p, i) => (
            <li key={p.src} className={`w-full shrink-0 snap-center sm:w-auto ${i === 0 ? layout.cover : ""}`}>
              <StockPhotoImage
                photo={p}
                label={l.displayAddress}
                small={i > 0}
                priority={i === 0}
                sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 640px) 25vw, 100vw"}
                className="aspect-[4/3] h-full w-full sm:aspect-auto"
              />
            </li>
          ))}
        </ul>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-white sm:hidden">
          {photos.length} photos · swipe
        </span>
      </div>
      <PhotoCredits photos={photos} />
    </figure>
  );
}

function PhotoCredits({ photos }: { photos: ReturnType<typeof listingPhotos> }) {
  return (
    <figcaption className="text-xs text-muted">
      <details>
        <summary className="cursor-pointer w-fit hover:text-ink">Illustrative stock photos, not this property. Photo credits</summary>
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {photos.map((p) => (
            <li key={p.src}>
              <a href={p.sourceUrl} className="underline hover:text-ink" target="_blank" rel="noopener noreferrer">
                {p.alt}
              </a>{" "}
              by {p.creator},{" "}
              <a href={p.licenceUrl} className="underline hover:text-ink" target="_blank" rel="noopener noreferrer">
                {p.licence}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </figcaption>
  );
}
