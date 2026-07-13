import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";
import { mergeConfig, loadEnv } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  staticDirs: ["../public"],
  viteFinal(config, { configType }) {
    const mode = configType === "PRODUCTION" ? "production" : "development";
    // Load all vars from .env, .env.local etc — empty prefix = load everything
    const env = loadEnv(mode, path.resolve(__dirname, ".."), "");

    return mergeConfig(config, {
      define: {
        // Shim process.env so Next.js-style NEXT_PUBLIC_ vars work in Vite
        "process.env": JSON.stringify(env),
      },
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "../src"),
          "next/link": path.resolve(__dirname, "./mocks/next/link.tsx"),
          "next/navigation": path.resolve(
            __dirname,
            "./mocks/next/navigation.ts"
          ),
          "next/image": path.resolve(__dirname, "./mocks/next/image.tsx"),
          "next/headers": path.resolve(__dirname, "./mocks/next/headers.ts"),
        },
      },
    });
  },
};

export default config;
