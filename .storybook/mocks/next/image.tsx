import React from "react";

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  placeholder?: string;
  blurDataURL?: string;
};

const Image = ({
  src,
  alt,
  fill,
  priority: _priority,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  sizes: _sizes,
  style,
  ...rest
}: ImageProps) => (
  <img
    src={src}
    alt={alt}
    style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style}
    {...rest}
  />
);

Image.displayName = "Image";
export default Image;
