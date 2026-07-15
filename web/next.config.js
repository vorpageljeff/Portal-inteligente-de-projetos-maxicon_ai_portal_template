/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const destination =
      apiUrl && !apiUrl.includes("SUA-API-DO-RENDER")
        ? apiUrl
        : "https://maxicon-ai-portal-api.onrender.com";

    return [
      {
        source: "/api/:path*",
        destination: `${destination}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${destination}/health`,
      },
    ];
  },
};

module.exports = nextConfig;
