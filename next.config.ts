// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "4000", pathname: "/uploads/**" },
      { protocol: "https", hostname: "https://backend-mtr.onrender.com", pathname: "/uploads/**" },
    ],
  },
  // لو كنت عامل experimental.optimizeCss: false تنجم تخليه/تنحيه بحرّيتك
  // experimental: { optimizeCss: false },
};

export default withNextIntl(nextConfig);
