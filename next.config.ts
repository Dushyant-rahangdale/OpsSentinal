import path from 'path';

import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === 'development', // Disable in dev for faster builds
  register: true,
  skipWaiting: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  output: 'standalone',
  // Explicitly set root to avoid system-wide watching
  outputFileTracingRoot: path.join(__dirname),
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@prisma/client', 'react-icons'],
  },
  // Turbopack: explicitly configure to allow custom webpack config
  turbopack: {},
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "manifest-src 'self'",
            ].join('; ')
          }
        ],
      },
    ];
  },
  // Bundle optimization
  webpack: (config, { isServer }) => {
    // Make twilio optional - it's only needed if WhatsApp notifications are enabled
    // Use IgnorePlugin to prevent webpack from trying to resolve it at build time
    if (isServer) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      // Ignore twilio module resolution - it will be loaded dynamically at runtime if needed
      // Use checkResource to conditionally ignore only if the module doesn't exist
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource: string) {
            // Only ignore twilio if it's being required
            if (resource === 'twilio') {
              try {
                // Try to resolve it - if it fails, we'll ignore it
                require.resolve('twilio');
                return false; // Don't ignore if it exists
              } catch {
                return true; // Ignore if it doesn't exist
              }
            }
            return false; // Don't ignore other modules
          },
        })
      );
    }

    // Only apply optimizations in production builds
    if (!isServer && process.env.NODE_ENV === 'production') {
      // Optimize client-side bundle
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for large libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default withPWA(nextConfig);
