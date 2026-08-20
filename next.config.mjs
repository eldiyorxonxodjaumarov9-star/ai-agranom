/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // App does not use next/image; disable Image Optimization so optional sharp/libvips
  // is not on the user-facing request path (GHSA-f88m-g3jw-g9cj mitigation).
  images: { unoptimized: true },
  // Windows + Node 24: jest-worker multi-process page collection can abort with
  // spawn UNKNOWN / UV_HANDLE_CLOSING. Cap workers locally; Vercel Linux is fine.
  ...(process.platform === "win32"
    ? { experimental: { cpus: 1, workerThreads: false } }
    : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
