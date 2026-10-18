import type { ContentEntry } from "../lib/content";

type CoverImageProps = {
  src: string;
  image?: ContentEntry["coverImage"];
  alt: string;
  className?: string;
  /** How wide the image shows, for the browser to pick a size from srcset. */
  sizes: string;
  /** The first cover a reader sees: load it right away and early. Everything else waits until it is near. */
  priority?: boolean;
};

/**
 * A cover with resized WebP copies when the build made them. Width and height
 * reserve the space, so nothing moves when the picture arrives.
 */
export function CoverImage({ src, image, alt, className, sizes, priority = false }: CoverImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={image?.src ?? src}
      srcSet={image?.srcset}
      sizes={image ? sizes : undefined}
      width={image?.width}
      height={image?.height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
