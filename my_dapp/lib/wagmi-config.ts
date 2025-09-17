/**"use server";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalanche, avalancheFuji } from "viem/chains";

export const config = getDefaultConfig({
  appName: 'AB Smart Wallet',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'your-project-id',
  chains: [avalanche, avalancheFuji],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
*/

import { createConfig, http } from 'wagmi';
import { avalanche, avalancheFuji } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [avalanche, avalancheFuji],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'AB Smart Wallet' }),
    walletConnect({ 
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'your-project-id' 
    }),
  ],
  transports: {
    [avalanche.id]: http(),
    [avalancheFuji.id]: http(),
  },
});
