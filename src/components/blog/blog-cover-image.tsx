type BlogCoverImageProps = {
  src: string;
  alt: string;
  variant?: "card" | "hero";
  className?: string;
};

export function BlogCoverImage({
  src,
  alt,
  variant = "card",
  className = "",
}: BlogCoverImageProps) {
  if (variant === "hero") {
    return (
      <div
        className={`relative mt-8 overflow-hidden rounded-2xl border bg-muted shadow-soft ${className}`}
      >
        <img
          src={src}
          alt={alt}
          width={1200}
          height={630}
          loading="eager"
          decoding="async"
          className="aspect-[1200/630] h-auto w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative mb-4 overflow-hidden rounded-xl bg-muted sm:mb-0 sm:shrink-0 sm:w-44 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        width={352}
        height={220}
        loading="lazy"
        decoding="async"
        className="aspect-[16/10] h-full w-full object-cover"
      />
    </div>
  );
}
