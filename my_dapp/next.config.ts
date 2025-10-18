import type { NextConfig } from "next";
import { webpack } from "next/dist/compiled/webpack/webpack";

const nextConfig: NextConfig = {
  /* config options here */
/**    webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  }, */  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle Node.js modules that don't work in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
        vm: false,
        // Handle pino and related modules
        'pino-pretty': false,
        'pino': false,
        // Handle node: scheme imports
        'node:crypto': require.resolve('crypto-browserify'),
        'node:buffer': require.resolve('buffer'),
        'node:stream': require.resolve('stream-browserify'),
        'node:util': require.resolve('util'),
        'node:url': require.resolve('url'),
        'node:path': require.resolve('path-browserify'),
        'node:os': false,
        'node:fs': false,
      };

      // Provide global polyfills
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      // Ignore pino in browser builds
      config.externals = config.externals || [];
      config.externals.push('pino', 'pino-pretty');
    }
    
    return config;
  },

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Transpile packages that might have issues
  transpilePackages: ['@rainbow-me/rainbowkit', '@walletconnect/ethereum-provider'],
  
};

export default nextConfig;
