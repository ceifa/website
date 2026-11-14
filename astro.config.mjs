// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import land from "./src/plugins/land.mjs";

const variable = (file) => ({
  src: [`./src/assets/fonts/${file}`],
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export default defineConfig({
  site: "https://ceifa.dev",
  // Keep the old blog's URLs: /webrtc, not /webrtc/.
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [sitemap()],
  markdown: {
    // Tokens take their colours from the --astro-code-* variables in site.css.
    shikiConfig: { theme: "css-variables" },
    processor: satteri({ hastPlugins: [land] }),
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Site",
      cssVariable: "--font-site",
      fallbacks: ["system-ui", "sans-serif"],
      options: { variants: [variable("sans.woff2")] },
    },
    {
      provider: fontProviders.local(),
      name: "Display",
      cssVariable: "--font-display",
      fallbacks: ["Georgia", "serif"],
      options: { variants: [variable("book.woff2")] },
    },
  ],
});
