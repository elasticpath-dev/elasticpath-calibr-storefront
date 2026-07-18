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

/** A node in the plain nav tree — used by the cascade (drill-down) style. */
export type NavTreeNode = {
  key: string;
  label: string;
  href: string;
  children?: NavTreeNode[];
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
  /**
   * The same descendants as megaMenu but as a plain tree — consumed by the
   * cascade nav style. Populated alongside megaMenu from the same data.
   */
  children?: NavTreeNode[];
};
