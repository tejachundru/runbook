import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  distDir: "out",
  productionBrowserSourceMaps: false,
};

export default nextConfig;
