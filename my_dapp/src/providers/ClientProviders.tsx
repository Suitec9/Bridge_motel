"use client"

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import '@rainbow-me/rainbowkit/styles.css';
import { config } from "../../lib/wagmi-config";
import { ReactNode, useState } from "react";

interface ClientProviderProps {
    children: ReactNode;
}

export function ClientProviders({ children}: ClientProviderProps) {
    // QueryClient in component avoids SSR issues
    const [ queryClient ] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                theme={ darkTheme ({
                    accentColor: '#7c3aed',
                    accentColorForeground: 'white',
                    borderRadius: 'medium'
                })}
                coolMode
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}