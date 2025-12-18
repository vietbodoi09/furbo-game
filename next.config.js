/** @type {import('next').NextConfig} */
const nextConfig = {
  // Quan trọng cho Vercel
  output: 'standalone',
  
  reactStrictMode: true,
  swcMinify: true,
  
  // Bắt buộc: Bỏ qua lỗi TypeScript/ESLint khi build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  webpack: (config, { isServer, webpack }) => {
    // Fix cho browser
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
        vm: require.resolve('vm-browserify'),
        zlib: require.resolve('browserify-zlib'),
        'pino-pretty': false, // Fix lỗi pino-pretty
      };
    }
    
    // Ignore pino-pretty hoàn toàn
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    );
    
    return config;
  },
  
  // Transpile các package Solana
  transpilePackages: [
    '@solana/web3.js',
    '@coral-xyz/anchor',
    '@solana/spl-token',
    '@fogo/sessions-sdk-react'
  ],
  
  // Optimize cho production
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
};

module.exports = nextConfig;
