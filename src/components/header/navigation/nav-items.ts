import type { NavItem } from "./types";

/** Static nav config — in production, fetch from Elastic Path catalog hierarchies */
export const NAV_ITEMS: NavItem[] = [
  {
    key: "shop",
    label: "Shop",
    href: "/shop",
    megaMenu: {
      columns: [
        {
          groups: [
            {
              heading: "Women",
              items: [
                { key: "w-new", label: "New Arrivals", href: "/shop/women/new" },
                { key: "w-tops", label: "Tops & Blouses", href: "/shop/women/tops" },
                { key: "w-bottoms", label: "Bottoms", href: "/shop/women/bottoms" },
                { key: "w-dresses", label: "Dresses", href: "/shop/women/dresses" },
                { key: "w-accessories", label: "Accessories", href: "/shop/women/accessories" },
              ],
            },
          ],
        },
        {
          groups: [
            {
              heading: "Men",
              items: [
                { key: "m-new", label: "New Arrivals", href: "/shop/men/new" },
                { key: "m-shirts", label: "Shirts", href: "/shop/men/shirts" },
                { key: "m-trousers", label: "Trousers", href: "/shop/men/trousers" },
                { key: "m-outerwear", label: "Outerwear", href: "/shop/men/outerwear" },
                { key: "m-accessories", label: "Accessories", href: "/shop/men/accessories" },
              ],
            },
          ],
        },
        {
          groups: [
            {
              heading: "Kids",
              items: [
                { key: "k-boys", label: "Boys", href: "/shop/kids/boys" },
                { key: "k-girls", label: "Girls", href: "/shop/kids/girls" },
                { key: "k-babies", label: "Babies", href: "/shop/kids/babies" },
              ],
            },
            {
              heading: "Brands",
              items: [
                { key: "b-featured", label: "Featured Brands", href: "/brands" },
                { key: "b-new", label: "New to Calibr", href: "/brands/new" },
              ],
            },
          ],
        },
      ],
      featured: {
        title: "Summer Sale",
        description: "Up to 50% off select styles",
        href: "/sale",
        imageBg: "from-brand-accent/30 to-brand-secondary/20",
      },
    },
  },
  {
    key: "collections",
    label: "Collections",
    href: "/collections",
    megaMenu: {
      columns: [
        {
          groups: [
            {
              heading: "By Season",
              items: [
                { key: "c-ss26", label: "Spring / Summer 2026", href: "/collections/ss26" },
                { key: "c-aw25", label: "Autumn / Winter 2025", href: "/collections/aw25" },
                { key: "c-archive", label: "Archive", href: "/collections/archive" },
              ],
            },
          ],
        },
        {
          groups: [
            {
              heading: "Curated Edits",
              items: [
                { key: "c-bestsellers", label: "Best Sellers", href: "/collections/best-sellers" },
                { key: "c-staff-picks", label: "Staff Picks", href: "/collections/staff-picks" },
                { key: "c-limited", label: "Limited Edition", href: "/collections/limited" },
              ],
            },
          ],
        },
        {
          groups: [
            {
              heading: "B2B",
              items: [
                { key: "c-bulk", label: "Bulk Orders", href: "/b2b/bulk" },
                { key: "c-corporate", label: "Corporate Gifting", href: "/b2b/corporate" },
                { key: "c-contracts", label: "Contract Pricing", href: "/b2b/contracts" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: "sale",
    label: "Sale",
    href: "/sale",
  },
  {
    key: "about",
    label: "About",
    href: "/about",
  },
];
