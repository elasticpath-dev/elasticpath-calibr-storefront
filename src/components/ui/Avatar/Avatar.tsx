import { type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export type AvatarProps = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
};

const sizeStyles: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ src, alt = "", fallback, size = "md", className, ...props }: AvatarProps) {
  const initials = fallback ? getInitials(fallback) : alt ? getInitials(alt) : "?";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-full bg-gray-200 overflow-hidden shrink-0",
        sizeStyles[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          {...props}
        />
      ) : (
        <span aria-hidden="true" className="font-semibold text-gray-600 leading-none select-none">
          {initials}
        </span>
      )}
    </span>
  );
}

export type AvatarGroupProps = {
  avatars: Pick<AvatarProps, "src" | "alt" | "fallback">[];
  size?: AvatarSize;
  max?: number;
};

export function AvatarGroup({ avatars, size = "md", max = 5 }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((av, i) => (
        <Avatar
          key={i}
          {...av}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {overflow > 0 && (
        <span
          aria-label={`${overflow} more`}
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-gray-100 ring-2 ring-white font-semibold text-gray-600",
            sizeStyles[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
