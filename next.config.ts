// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // ✅ ما عادش optimization
    unoptimized: true,
    // ✅ امنع استيراد الصور كـ modules (يوقّف لودر البلور)
    disableStaticImages: true as any,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "4000", pathname: "/uploads/**" },
      { protocol: "https", hostname: "https://backend-mtr.onrender.com", pathname: "/uploads/**" },
    ],
  },

  webpack: (config) => {
    // ✅ خليه لو حاول أي باكيج يطلب sharp، يرجّع false (ما يتحمّلش)
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...(config.resolve.alias || {}), sharp: false };

    // ✅ نمنعو لودر البلور متاع next من الخدمة
    config.module.rules?.push({
      test: /next-image-loader[\\/](blur|index)\.js$/,
      use: [{ loader: require.resolve("null-loader") }],
    } as any);

    return config;
  },

  // (اختياري) كانك على Tailwind v4 وثمّة مشكلة lightningcss
  // experimental: { optimizeCss: false },
};

export default withNextIntl(nextConfig);
