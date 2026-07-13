"use client";

import Image from "next/image";
import Link from "next/link";

export type StorefrontLogoProps = {
  href?: string;
  imageUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
};

export function StorefrontLogo({
  href = "/",
  imageUrl = "/logo.png",
  alt = "Logo",
  width = 140,
  height = 40,
  className = "",
}: StorefrontLogoProps) {
  return (
    <Link
      href={href}
      aria-label={alt}
      className={`inline-flex items-center shrink-0 ${className}`}
    >
      <Image
        src={imageUrl}
        alt={alt}
        width={width}
        height={height}
        priority
        style={{ width: "auto", height: height }}
      />
    </Link>
  );
}
