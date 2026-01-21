import { Layers } from "lucide-react";
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
        path: require.resolve('path-browserify'),
        os: false,
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
        'node: worker_threads': false,
      };

    // Provide global polyfills
    config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      // Ignore problematic modules in browser build
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(pino|pino-pretty|web-worker)$/,
        })
      );

      // Handle WASM files proprerly
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        layers: true,
      }

      // Handle .wasm files
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });
      
      //Supress the web-worker warning
      config.module.rules.push({
        test: /node_modules\/web-worker/,
        use: {
          loader: 'null-loader'
        },
      });

      // Configure worker-loader for proper bundling
      config.module.rules.push({
        test: /\.worker\.(ts|js)$/,
        use: {
          loader: 'worker-loader',
          options: {
            filename: 'static/[hash].worker.js',
            publicPath: '/_next/',
          },
        },
      });
    }

    // Ignore specific warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Can't resolve 'worker_threads/,
    ];
    
    return config;
  },

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Transpile packages that might have issues
  transpilePackages: [
    '@rainbow-me/rainbowkit', 
    '@walletconnect/ethereum-provider',
    'circomlibjs',
    'ffjavascript',  
  ],

  // Increase memory for build process
  experimental: {
    workerThreads: false,
    cpus: 1,     
  }
  
};

export default nextConfig;
