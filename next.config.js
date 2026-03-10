/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/qbo-dashboard',
        destination: '/quickbooks',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig
