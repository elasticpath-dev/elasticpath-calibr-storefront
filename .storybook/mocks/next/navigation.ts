import { fn } from "@storybook/test";

export const useRouter = () => ({
  push: fn(),
  replace: fn(),
  back: fn(),
  forward: fn(),
  prefetch: fn(),
  refresh: fn(),
});

export const usePathname = () => "/en";
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({ lang: "en" });
export const notFound = fn();
export const redirect = fn();
