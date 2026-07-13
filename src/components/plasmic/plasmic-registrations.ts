import type { NextJsPlasmicComponentLoader } from "@plasmicapp/loader-nextjs";

// Header
import { StorefrontLogo } from "@/components/header/StorefrontLogo";

// Footer
import { StorefrontFooter } from "@/components/footer/StorefrontFooter";

// UI primitives
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card/Card";

// Commerce — display
import { Price } from "@/components/product/Price";
import { ProductThumbnail } from "@/components/product/ProductThumbnail";
import { ProductName } from "@/components/product/ProductName";
import { ProductDescription } from "@/components/product/ProductDescription";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGrid } from "@/components/product/ProductGrid";

// Commerce — interactive
import { AddToCart } from "@/components/product/AddToCart";
import { QuantitySelector } from "@/components/product/QuantitySelector";
import { QuantityAddToCart } from "@/components/product/QuantityAddToCart";

// Commerce — carousel
import { ProductCarousel, type ProductCarouselProps } from "@/components/plasmic/blocks/ProductCarousel/ProductCarousel";
import { ProductPickerControl } from "@/components/plasmic/blocks/ProductCarousel/ProductPickerControl";
import { NodePickerControl } from "@/components/plasmic/blocks/ProductCarousel/NodePickerControl";

// Shared default product used for canvas preview
const DEMO_PRODUCT = {
  id: "demo-product",
  slug: "demo-product",
  name: "Demo Product",
  priceFormatted: "$99.00",
  originalPriceFormatted: "",
  imageUrl: "",
  description: "A sample product for canvas preview.",
};

const PRODUCT_FIELDS = {
  id: { type: "string" as const },
  slug: { type: "string" as const },
  name: { type: "string" as const },
  priceFormatted: { type: "string" as const },
  originalPriceFormatted: { type: "string" as const },
  imageUrl: { type: "imageUrl" as const },
  description: { type: "string" as const },
};

// Called once per newly created loader instance (see getClientPlasmicLoader
// in plasmic-loader.ts) — registerComponent() is scoped to the specific
// loader instance it's called on, so every distinct per-tenant loader needs
// its own full set of registrations.
export function registerPlasmicComponents(
  loader: NextJsPlasmicComponentLoader,
): void {
  // ─── StorefrontLogo ───────────────────────────────────────────────────────
  loader.registerComponent(StorefrontLogo, {
    name: "StorefrontLogo",
    description: "Brand logo with a configurable image and link. Defaults to /logo.png.",
    classNameProp: "className",
    props: {
      href: {
        type: "string",
        defaultValue: "/",
        description: "URL the logo links to",
      },
      imageUrl: {
        type: "imageUrl",
        defaultValue: "/logo.png",
        description: "Logo image — defaults to /logo.png in the public folder",
      },
      alt: {
        type: "string",
        defaultValue: "Logo",
        description: "Alt text for the logo image",
      },
      width: {
        type: "number",
        defaultValue: 140,
        description: "Intrinsic width of the logo image in px",
      },
      height: {
        type: "number",
        defaultValue: 40,
        description: "Rendered height of the logo in px",
      },
    },
    importPath: "@/components/header/StorefrontLogo",
    importName: "StorefrontLogo",
  });

  // ─── Button ──────────────────────────────────────────────────────────────
  loader.registerComponent(Button, {
    name: "Button",
    classNameProp: "className",
    props: {
      children: "slot",
      variant: {
        type: "choice",
        options: ["primary", "secondary", "outline", "ghost", "destructive", "link"],
        defaultValue: "primary",
      },
      size: {
        type: "choice",
        options: ["xs", "sm", "md", "lg"],
        defaultValue: "md",
      },
      disabled: { type: "boolean", defaultValue: false },
      fullWidth: { type: "boolean", defaultValue: false },
      isLoading: { type: "boolean", defaultValue: false },
    },
    importPath: "@/components/ui/Button/Button",
    importName: "Button",
  });

  // ─── Badge ───────────────────────────────────────────────────────────────
  loader.registerComponent(Badge, {
    name: "Badge",
    classNameProp: "className",
    props: {
      children: "slot",
      variant: {
        type: "choice",
        options: ["default", "success", "warning", "error", "info", "outline"],
        defaultValue: "default",
      },
      size: {
        type: "choice",
        options: ["sm", "md"],
        defaultValue: "md",
      },
      dot: { type: "boolean", defaultValue: false },
    },
    importPath: "@/components/ui/Badge/Badge",
    importName: "Badge",
  });

  // ─── Card ─────────────────────────────────────────────────────────────────
  loader.registerComponent(Card, {
    name: "Card",
    classNameProp: "className",
    props: {
      children: "slot",
      variant: {
        type: "choice",
        options: ["default", "bordered", "elevated"],
        defaultValue: "default",
      },
    },
    importPath: "@/components/ui/Card/Card",
    importName: "Card",
  });

  loader.registerComponent(CardHeader, {
    name: "CardHeader",
    classNameProp: "className",
    props: { children: "slot" },
    importPath: "@/components/ui/Card/Card",
    importName: "CardHeader",
  });

  loader.registerComponent(CardTitle, {
    name: "CardTitle",
    classNameProp: "className",
    props: { children: "slot" },
    importPath: "@/components/ui/Card/Card",
    importName: "CardTitle",
  });

  loader.registerComponent(CardDescription, {
    name: "CardDescription",
    classNameProp: "className",
    props: { children: "slot" },
    importPath: "@/components/ui/Card/Card",
    importName: "CardDescription",
  });

  loader.registerComponent(CardBody, {
    name: "CardBody",
    classNameProp: "className",
    props: { children: "slot" },
    importPath: "@/components/ui/Card/Card",
    importName: "CardBody",
  });

  loader.registerComponent(CardFooter, {
    name: "CardFooter",
    classNameProp: "className",
    props: { children: "slot" },
    importPath: "@/components/ui/Card/Card",
    importName: "CardFooter",
  });

  // ─── Price ────────────────────────────────────────────────────────────────
  loader.registerComponent(Price, {
    name: "Price",
    classNameProp: "className",
    props: {
      formatted: { type: "string", defaultValue: "$99.00" },
      originalFormatted: { type: "string", defaultValue: "" },
    },
    importPath: "@/components/product/Price",
    importName: "Price",
  });

  // ─── ProductThumbnail ─────────────────────────────────────────────────────
  loader.registerComponent(ProductThumbnail, {
    name: "ProductThumbnail",
    classNameProp: "className",
    props: {
      imageUrl: { type: "imageUrl", defaultValue: "" },
      name: { type: "string", defaultValue: "Product" },
      priority: { type: "boolean", defaultValue: false },
    },
    importPath: "@/components/product/ProductThumbnail",
    importName: "ProductThumbnail",
  });

  // ─── ProductName ──────────────────────────────────────────────────────────
  loader.registerComponent(ProductName, {
    name: "ProductName",
    classNameProp: "className",
    props: {
      name: { type: "string", defaultValue: "Product Name" },
      as: {
        type: "choice",
        options: ["h1", "h2", "h3", "p"],
        defaultValue: "h3",
      },
    },
    importPath: "@/components/product/ProductName",
    importName: "ProductName",
  });

  // ─── ProductDescription ───────────────────────────────────────────────────
  loader.registerComponent(ProductDescription, {
    name: "ProductDescription",
    classNameProp: "className",
    props: {
      description: {
        type: "string",
        defaultValue: "Product description goes here.",
      },
      truncate: { type: "boolean", defaultValue: false },
    },
    importPath: "@/components/product/ProductDescription",
    importName: "ProductDescription",
  });

  // ─── AddToCart ────────────────────────────────────────────────────────────
  loader.registerComponent(AddToCart, {
    name: "AddToCart",
    classNameProp: "className",
    props: {
      productId: { type: "string", defaultValue: "demo-product" },
      quantity: { type: "number", defaultValue: 1 },
      variant: {
        type: "choice",
        options: ["default", "full"],
        defaultValue: "default",
      },
    },
    importPath: "@/components/product/AddToCart",
    importName: "AddToCart",
  });

  // ─── QuantitySelector ─────────────────────────────────────────────────────
  loader.registerComponent(QuantitySelector, {
    name: "QuantitySelector",
    classNameProp: "className",
    props: {
      value: { type: "number", defaultValue: 1 },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "quantity", type: { type: "number" } }],
      },
      min: { type: "number", defaultValue: 1 },
      max: { type: "number", defaultValue: 999 },
      disabled: { type: "boolean", defaultValue: false },
    },
    importPath: "@/components/product/QuantitySelector",
    importName: "QuantitySelector",
  });

  // ─── QuantityAddToCart ────────────────────────────────────────────────────
  loader.registerComponent(QuantityAddToCart, {
    name: "QuantityAddToCart",
    props: {
      productId: { type: "string", defaultValue: "demo-product" },
    },
    importPath: "@/components/product/QuantityAddToCart",
    importName: "QuantityAddToCart",
  });

  // ─── ProductCard ──────────────────────────────────────────────────────────
  loader.registerComponent(ProductCard, {
    name: "ProductCard",
    props: {
      product: {
        type: "object",
        fields: PRODUCT_FIELDS,
        defaultValue: DEMO_PRODUCT,
      },
      lang: { type: "string", defaultValue: "en" },
      priority: { type: "boolean", defaultValue: false },
    },
    importPath: "@/components/product/ProductCard",
    importName: "ProductCard",
  });

  // ─── ProductGrid ──────────────────────────────────────────────────────────
  loader.registerComponent(ProductGrid, {
    name: "ProductGrid",
    props: {
      products: {
        type: "array",
        itemType: { type: "object", fields: PRODUCT_FIELDS },
        defaultValue: [
          DEMO_PRODUCT,
          { ...DEMO_PRODUCT, id: "demo-product-2", name: "Demo Product 2" },
          { ...DEMO_PRODUCT, id: "demo-product-3", name: "Demo Product 3" },
          { ...DEMO_PRODUCT, id: "demo-product-4", name: "Demo Product 4" },
        ],
      },
      lang: { type: "string", defaultValue: "en" },
    },
    importPath: "@/components/product/ProductGrid",
    importName: "ProductGrid",
  });

  // ─── ProductCarousel ──────────────────────────────────────────────────────
  loader.registerComponent(ProductCarousel, {
    name: "ProductCarousel",
    description:
      "Displays an Elastic Path catalog product carousel. Select products by ID or by a catalog node.",
    props: {
      selectionMode: {
        type: "choice",
        options: ["products", "node"],
        defaultValue: "products",
        description: "Fetch products by specific IDs or by a catalog node",
      },
      products: {
        type: "custom",
        control: ProductPickerControl,
        description:
          "Search and select catalog products by name, SKU, or slug (used when Selection Mode is 'products')",
        hidden: (props: ProductCarouselProps) => props.selectionMode === "node",
      },
      nodeId: {
        type: "custom",
        control: NodePickerControl,
        description:
          "Select a hierarchy then a node — products in that node will be shown (used when Selection Mode is 'node')",
        hidden: (props: ProductCarouselProps) => props.selectionMode !== "node",
      },
      lang: {
        type: "string",
        defaultValue: "en",
        description: "Locale prefix for product detail page links (e.g. 'en', 'fr')",
      },
      title: {
        type: "string",
        defaultValue: "",
        description: "Optional heading rendered above the carousel",
      },
      slidesToShow: {
        type: "number",
        defaultValue: 4,
        description: "Number of product cards visible at once",
      },
      autoplay: {
        type: "boolean",
        defaultValue: false,
        description: "Automatically scroll the carousel",
      },
      autoplayInterval: {
        type: "number",
        defaultValue: 3000,
        description: "Autoplay interval in milliseconds",
        hidden: (props: ProductCarouselProps) => !props.autoplay,
      },
      showDots: {
        type: "boolean",
        defaultValue: false,
        description: "Show pagination dots below the carousel",
      },
      infinite: {
        type: "boolean",
        defaultValue: false,
        description: "Loop back to the start when reaching the last card",
      },
      className: {
        type: "class",
        description: "CSS class applied to the carousel wrapper",
      },
    },
    importPath: "@/components/plasmic/blocks/ProductCarousel/ProductCarousel",
    importName: "ProductCarousel",
  });

  // ─── StorefrontFooter ─────────────────────────────────────────────────────
  loader.registerComponent(StorefrontFooter, {
    name: "StorefrontFooter",
    description: "Site footer with logo, dynamic link columns, and copyright bar.",
    classNameProp: "className",
    props: {
      lang: {
        type: "string",
        defaultValue: "en",
        description: "Locale prefix for internal links (e.g. 'en', 'fr')",
      },
      logoUrl: {
        type: "imageUrl",
        defaultValue: "/logo.png",
        description: "Footer logo image",
      },
      logoAlt: {
        type: "string",
        defaultValue: "Elastic Path",
        description: "Alt text for the footer logo",
      },
      tagline: {
        type: "string",
        defaultValue:
          "API-first composable commerce built for enterprise brands with complex requirements.",
        description: "Short brand description below the logo",
      },
      columns: {
        type: "array",
        itemType: {
          type: "object",
          nameFunc: (item: { heading?: string }) => item?.heading || "Column",
          fields: {
            heading: {
              type: "string",
              defaultValue: "Column",
            },
            links: {
              type: "array",
              itemType: {
                type: "object",
                nameFunc: (item: { label?: string }) => item?.label || "Link",
                fields: {
                  label: { type: "string" },
                  href: { type: "string" },
                },
              },
            },
          },
        },
        defaultValue: [
          {
            heading: "Shop",
            links: [
              { label: "All Products", href: "/category" },
              { label: "Featured", href: "/" },
            ],
          },
          {
            heading: "Account",
            links: [
              { label: "My Account", href: "/account" },
              { label: "Order History", href: "/account" },
            ],
          },
          {
            heading: "Company",
            links: [
              { label: "About", href: "/" },
              { label: "Contact", href: "/" },
            ],
          },
        ],
        description: "Footer link columns — add, remove, or reorder freely",
      },
      copyrightText: {
        type: "string",
        defaultValue: "",
        description:
          "Override the copyright line. Leave blank to use the auto-generated year.",
      },
      privacyPolicyLabel: {
        type: "string",
        defaultValue: "Privacy Policy",
        description: "Label for the Privacy Policy link",
      },
      privacyPolicyHref: {
        type: "string",
        defaultValue: "/",
        description: "URL for the Privacy Policy link",
      },
      termsLabel: {
        type: "string",
        defaultValue: "Terms of Service",
        description: "Label for the Terms of Service link",
      },
      termsHref: {
        type: "string",
        defaultValue: "/",
        description: "URL for the Terms of Service link",
      },
    },
    importPath: "@/components/footer/StorefrontFooter",
    importName: "StorefrontFooter",
  });
}
