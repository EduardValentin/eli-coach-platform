import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";

type ItemPhoto = { src: string; alt: string };

type ItemVisualProps = DataAttributes & {
  icon: LucideIcon;
  name: string;
  photo?: ItemPhoto;
  iconSize?: number;
  className?: string;
};

export function ItemVisual({
  icon: Icon,
  name,
  photo,
  iconSize = 28,
  className,
  ...data
}: ItemVisualProps) {
  const [failedPhotoSrc, setFailedPhotoSrc] = useState<string>();

  if (photo && photo.src !== failedPhotoSrc) {
    return (
      <img
        {...data}
        alt={photo.alt}
        className={cn("object-cover", className)}
        loading="lazy"
        onError={() => setFailedPhotoSrc(photo.src)}
        src={photo.src}
      />
    );
  }

  return (
    <div
      {...data}
      aria-label={name}
      className={cn(
        "flex items-center justify-center bg-surface-quiet",
        className,
      )}
      role="img"
    >
      <Icon aria-hidden="true" size={iconSize} />
    </div>
  );
}
