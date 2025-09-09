// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// ✅ مرّر المسار فقط (بدون object)
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // ⛔️ عطّل الأوبتمايزر باش ما يستعملش sharp
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "http",  hostname: "localhost",  port: "4000", pathname: "/uploads/**" },
      { protocol: "http",  hostname: "127.0.0.1",  port: "4000", pathname: "/uploads/**" },
      { protocol: "https", hostname: "https://backend-mtr.onrender.com", pathname: "/uploads/**" },
    ],
  },

  // 🔕 (اختياري) كانك على Tailwind v4 وتحب تتفادى lightningcss:
  // experimental: { optimizeCss: false },

  // 🧯 (اختياري) safety: لو فما باكيجات تستورد sharp ضمنيًا، ننحيه من الـ bundle
  // webpack: (config) => {
  //   config.resolve.alias = { ...(config.resolve.alias || {}), sharp: false };
  //   return config;
  // },
};

export default withNextIntl(nextConfig);
