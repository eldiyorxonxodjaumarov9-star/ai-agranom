/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Faqat local Express server ishlatilganda (USE_EXTERNAL_API=true)
    if (process.env.USE_EXTERNAL_API === "true" && process.env.API_URL) {
      return [
        {
          source: "/api/ai/:path*",
          destination: `${process.env.API_URL}/api/ai/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
