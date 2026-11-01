import { useState, useEffect } from "react";
import { cn, upgradeCoverUrl } from "../lib/utils";
import { ChordlyMark } from "./Logo";

export function Artwork({
  src,
  alt = "",
  className,
  rounded = "rounded-xl",
  priority = false,
  children,
}: {
  src?: string;
  alt?: string;
  className?: string;
  rounded?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const highRes = src ? upgradeCoverUrl(src) : "";
  const [imgSrc, setImgSrc] = useState(highRes);
  const [hasError, setHasError] = useState(!highRes);

  useEffect(() => {
    const upgraded = src ? upgradeCoverUrl(src) : "";
    setImgSrc(upgraded);
    setHasError(!upgraded);
  }, [src]);

  const handleError = () => {
    if (imgSrc && imgSrc.includes("maxresdefault.jpg")) {
      setImgSrc(imgSrc.replace("maxresdefault.jpg", "hqdefault.jpg"));
    } else {
      setHasError(true);
    }
  };

  return (
    <div className={cn("artwork relative overflow-hidden bg-[var(--surface)]", rounded, className)}>
      {imgSrc && !hasError ? (
        <img
          src={imgSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onError={handleError}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex w-full h-full items-center justify-center bg-white/[0.04] text-[var(--faint)]">
          <ChordlyMark className="h-5 w-5 opacity-40" />
        </div>
      )}
      {children}
    </div>
  );
}
