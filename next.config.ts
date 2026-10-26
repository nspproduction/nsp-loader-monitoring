import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is entirely dynamic (realtime queue, auth sessions).
  // Disabled so pages with cookies / DB access render dynamically at request time.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
