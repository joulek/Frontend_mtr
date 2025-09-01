import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// ✅ مرّر المسار فقط (بدون object)
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost",   port: "4000", pathname: "/uploads/**" },
      { protocol: "http",  hostname: "127.0.0.1",  port: "4000", pathname: "/uploads/**" },
      // لو عندك باكند على Render زيد الـ host متاعه هنا
      // { protocol: "https", hostname: "mtr-backend-xxxx.onrender.com", pathname: "/uploads/**" }
    ]
  }
};

export default withNextIntl(nextConfig);
