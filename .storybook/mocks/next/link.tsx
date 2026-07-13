import React from "react";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, prefetch: _prefetch, children, ...rest }, ref) => (
    <a ref={ref} href={href} {...rest}>
      {children}
    </a>
  )
);

Link.displayName = "Link";
export default Link;
