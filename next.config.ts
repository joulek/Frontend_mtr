// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [

      { protocol: "https", hostname: "backend-mtr.onrender.com", pathname: "/uploads/**" },
    ],
  },
  // لو كنت عامل experimental.optimizeCss: false تنجم تخليه/تنحيه بحرّيتك
  // experimental: { optimizeCss: false },
};

export default withNextIntl(nextConfig);
