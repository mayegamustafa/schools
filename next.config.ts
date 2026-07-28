import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        // All school and site media lives here. Without this entry next/image
        // throws on every uploaded logo, cover, and gallery photo.
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // School photos come from phone cameras — serve modern formats.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
