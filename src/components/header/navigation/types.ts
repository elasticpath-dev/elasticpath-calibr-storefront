export type NavLeaf = {
  key: string;
  label: string;
  href: string;
};

/** A group of links within one mega-menu column */
export type NavColumnGroup = {
  /** Optional column heading */
  heading?: string;
  /** When set, the heading renders as a link to this path */
  headingHref?: string;
  items: NavLeaf[];
};

/** One column inside the mega-menu */
export type NavColumn = {
  groups: NavColumnGroup[];
};

/** A top-level nav item — may have a mega-menu */
export type NavItem = {
  key: string;
  label: string;
  href: string;
  /** When present, hovering/clicking opens the mega-menu panel */
  megaMenu?: {
    columns: NavColumn[];
    /** Optional featured card shown after the columns */
    featured?: {
      title: string;
      description: string;
      href: string;
      imageBg?: string;
    };
  };
};
